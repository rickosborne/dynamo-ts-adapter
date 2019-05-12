import {DynamoDB} from "aws-sdk";
import {RequiredValueError} from "./RequiredValueError";

export type FromDynamo<T> = (attrValue: DynamoDB.AttributeValue) => T;
export interface DynamoValueReaderPair<T> {
  orThrow: (typeName: string, keyName: string) => FromDynamo<T>;
  orUndef: FromDynamo<T | undefined>;
}

function readerPair<TYPE>(accessor: FromDynamo<TYPE | undefined>): DynamoValueReaderPair<TYPE> {
  const orUndef = (attrValue: DynamoDB.AttributeValue) => attrValue != null ? accessor(attrValue) : undefined;
  const orThrow = (typeName: string, keyName: string) => (attrValue: DynamoDB.AttributeValue) => {
    const maybe = orUndef(attrValue);
    if (maybe == null) {
      throw new RequiredValueError(typeName, keyName);
    }
    return maybe;
  };
  return {orThrow, orUndef};
}

export const dynamoValue = {
  reader: {
    bool: readerPair<boolean>((v) => v.BOOL != null ? v.BOOL : undefined),
    date: readerPair<Date>((v) => v.N != null ? new Date(parseInt(v.N, 10)) : undefined),
    float: readerPair<number>((v) => v.N != null ? parseFloat(v.N) : undefined),
    int: readerPair<number>((v) => v.N != null ? parseInt(v.N, 10) : undefined),
    string: readerPair<string>((v) => v.S != null ? v.S : undefined),
  },
  writer: {
    bool: (b: boolean) => ({BOOL: b}) as DynamoDB.AttributeValue,
    date: (d: Date) => ({N: String(d.valueOf())}) as DynamoDB.AttributeValue,
    float: (f: number) => ({N: String(f)}) as DynamoDB.AttributeValue,
    int: (i: number) => ({N: String(i)}) as DynamoDB.AttributeValue,
    string: (s: string) => ({S: s}) as DynamoDB.AttributeValue,
  },
};
