import {DynamoDB} from "aws-sdk";
import {expect} from 'chai';
import {describe, it} from 'mocha';

import {DynamoParser} from './DynamoParser';
import {dynamoValue} from "./DynamoValueUtil";
import {RequiredValueError} from "./RequiredValueError";

export interface MegaCombo {
  optDate?: Date;
  optInt?: number;
  optString?: string;
  reqDate: Date;
  reqInt: number;
  reqString: string;
}

describe('DynamoParser', () => {

  interface TestSetup<TYPE> {
    fromDynamo: (value: DynamoDB.AttributeValue) => TYPE | undefined;
    name: string;
    parserOptional: (parser: DynamoParser<any, any>) => DynamoParser<any, any>;
    parserRequired: (parser: DynamoParser<any, any>) => DynamoParser<any, any>;
    randomValue: () => TYPE;
    toDynamo: (value: TYPE) => DynamoDB.AttributeValue;
  }

  const types: Array<TestSetup<any>> = [{
    fromDynamo: dynamoValue.reader.string.orUndef,
    name: 'String',
    parserOptional: (p) => p.optionalString('opt'),
    parserRequired: (p) => p.requiredString('req'),
    randomValue: () => String(Math.random()),
    toDynamo: dynamoValue.writer.string,
  }, {
    fromDynamo: dynamoValue.reader.int.orUndef,
    name: 'Int',
    parserOptional: (p) => p.optionalInt('opt'),
    parserRequired: (p) => p.requiredInt('req'),
    randomValue: () => Math.round(Math.random() * 100000),
    toDynamo: dynamoValue.writer.int,
  }, {
    fromDynamo: dynamoValue.reader.date.orUndef,
    name: 'Date',
    parserOptional: (p) => p.optionalDate('opt'),
    parserRequired: (p) => p.requiredDate('req'),
    randomValue: () => new Date(Math.round(Math.random() * 100000)),
    toDynamo: dynamoValue.writer.date,
  }, {
    fromDynamo: dynamoValue.reader.float.orUndef,
    name: 'Float',
    parserOptional: (p) => p.optionalFloat('opt'),
    parserRequired: (p) => p.requiredFloat('req'),
    randomValue: () => Math.random() * 100,
    toDynamo: dynamoValue.writer.float,
  }, {
    fromDynamo: dynamoValue.reader.bool.orUndef,
    name: 'Bool',
    parserOptional: (p) => p.optionalBool('opt'),
    parserRequired: (p) => p.requiredBool('req'),
    randomValue: () => (Math.round((Math.random() * 100)) % 2) === 1,
    toDynamo: dynamoValue.writer.bool,
  }];

  for (const type of types) {
    const parserOptional = type.parserOptional(new DynamoParser<any, any>(`Optional${type.name}`));
    const deserializerOptional = parserOptional.deserializer();
    const serializerOptional = parserOptional.serializer();
    const parserRequired = type.parserRequired(new DynamoParser<any, any>(`Required${type.name}`));
    const deserializerRequired = parserRequired.deserializer();
    const serializerRequired = parserRequired.serializer();

    describe(type.name, () => {
      describe('deserializer', () => {
        it('optional returns correct value for valid present data', () => {
          const map: DynamoDB.AttributeMap = {
            unused: {S: 'bar'},
          };
          const left = type.randomValue();
          map.opt = type.toDynamo(left);
          const expected: {[key: string]: any} = {};
          expected.opt = left;
          expect(deserializerOptional.deserialize(map)).deep.equals(expected);
        });
        it('optional returns empty for valid missing data', () => {
          expect(deserializerOptional.deserialize({unused: {S: 'foo'}})).deep.equals({});
        });
        it('optional returns empty for wrong type', () => {
          expect(deserializerOptional.deserialize({opt: {B: 'foo'}, unused: {S: 'bar'}})).deep.equals({});
        });
        it('optional returns null for null map', () => {
          expect(deserializerOptional.deserialize(null)).equals(null);
        });
        it('required returns correct value for good data', () => {
          const map: DynamoDB.AttributeMap = {
            unused: {S: 'bar'},
          };
          const left = type.randomValue();
          map.req = type.toDynamo(left);
          const expected: {[key: string]: any} = {};
          expected.opt = left;
          expect(deserializerRequired.deserialize(map)).deep.equals({req: left});
        });
        it('required throws for missing string', () => {
          expect(() => deserializerRequired.deserialize({unused: {S: 'bar'}}))
            .throws(RequiredValueError, `Required${type.name}.req`);
        });
        it('required throws for not-a-string', () => {
          expect(() => deserializerRequired.deserialize({req: {B: 'foo'}, unused: {S: 'bar'}}))
            .throws(RequiredValueError, `Required${type.name}.req`);
        });
        it('required returns null for null map', () => {
          expect(deserializerRequired.deserialize(null)).equals(null);
        });
      });
      describe('serializer', () => {
        it('optional returns null for null object', () => {
          expect(serializerOptional.serialize(null)).deep.equals(null);
        });
        it('optional returns null for undefined object', () => {
          expect(serializerOptional.serialize(undefined)).deep.equals(null);
        });
        it('optional omits the key when missing', () => {
          expect(serializerOptional.serialize({unused: true} as any)).deep.equals({});
        });
        it('optional creates the correct AttrValue when present', () => {
          const left = type.randomValue();
          const actual: {[key: string]: any} = {unused: 'quux'};
          actual.opt = left;
          expect(serializerOptional.serialize(actual as any)).deep.equals({opt: type.toDynamo(left)});
        });
        it('required returns null for null object', () => {
          expect(serializerRequired.serialize(null)).deep.equals(null);
        });
        it('required returns null for undefined object', () => {
          expect(serializerRequired.serialize(undefined)).deep.equals(null);
        });
        it('required throws an error when missing', () => {
          expect(() => serializerRequired.serialize({unused: true} as any))
            .throws(RequiredValueError, `Required${type.name}.req`);
        });
        it('required creates the correct AttrValue when present', () => {
          const value = type.randomValue();
          expect(serializerRequired.serialize({req: value, unused: true} as any)).deep.equals({req: type.toDynamo(value)});
        });
      });
    });
  }

  describe('MegaCombo', () => {
    const megaParser = new DynamoParser<MegaCombo>('MegaCombo')
      .optionalDate('optDate')
      .optionalInt('optInt')
      .optionalString('optString')
      .requiredDate('reqDate')
      .requiredInt('reqInt')
      .requiredString('reqString');
    const megaSerializer = megaParser.serializer();
    const megaDeserializer = megaParser.deserializer();
    const optDate = new Date(98765432);
    const reqDate = new Date(23456789);
    const attrValue: DynamoDB.AttributeMap = {
      optDate: {N: String(optDate.valueOf())},
      optInt: {N: '2468'},
      optString: {S: 'bravo'},
      reqDate: {N: String(reqDate.valueOf())},
      reqInt: {N: '3579'},
      reqString: {S: 'charlie'},
    };
    const mega: MegaCombo = {
      optDate,
      optInt: 2468,
      optString: 'bravo',
      reqDate,
      reqInt: 3579,
      reqString: 'charlie',
    };

    it('reads all the things', () => {
      expect(megaDeserializer.deserialize(attrValue)).deep.equals(mega);
    });
    it('writes all the things', () => {
      expect(megaSerializer.serialize(mega)).deep.equals(attrValue);
    });
  });
});
