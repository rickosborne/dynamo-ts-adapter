import {DynamoDB} from "aws-sdk";
import {DynamoAttr} from "./DynamoAttr";
import {DynamoDeserializer} from "./DynamoDeserializer";
import {DynamoSerializer} from "./DynamoSerializer";
import {dynamoValue, FromDynamo} from "./DynamoValueUtil";
import {RequiredValueError} from "./RequiredValueError";

export type IncompleteDefinition = never;

export class DynamoParser<TARGET extends {[key: string]: any}, PROGRESS = {}>
  implements DynamoDeserializer<TARGET>, DynamoSerializer<TARGET> {
  private readonly attrs: Array<DynamoAttr<TARGET, any>> = [];

  constructor(private readonly typeName: string) {
  }

  private addAttribute<KEY extends string & keyof TARGET, VALUE extends TARGET[KEY]>(
    key: KEY,
    optional: boolean,
    fromDynamo: FromDynamo<VALUE>,
    toDynamo: (value: VALUE) => DynamoDB.AttributeValue,
  ): this {
    this.attrs.push({
      accessor: optional ? this.optionalAccessor<KEY, VALUE>(key) : this.requiredAccessor<KEY, VALUE>(key),
      fromDynamo,
      key,
      optional,
      serialize: this.attributeSerializer<KEY, VALUE>(key, optional, toDynamo),
      setter: optional ? this.optionalSetter<KEY, VALUE>(key) : this.requiredSetter<KEY, VALUE>(key),
    });
    return this;
  }

  private attributeSerializer<KEY extends string & keyof TARGET, VALUE extends TARGET[KEY]>(
    key: string & keyof TARGET,
    optional: boolean,
    supplier: (value: VALUE) => DynamoDB.AttributeValue,
  ): (target: TARGET | undefined, map: DynamoDB.AttributeMap | undefined) => void {
    const accessor: (target?: TARGET) => (VALUE | undefined) = (optional ? this.optionalAccessor : this.requiredAccessor)
      .call(this, key) as any;
    return (target, map) => {
      /* istanbul ignore next */
      if (target == null || map == null) {
        return;
      }
      const value = accessor(target);
      if (value !== undefined) {
        map[key] = supplier(value);
      }
    };
  }

  public deserialize(map: DynamoDB.AttributeMap | null): TARGET | null {
    if (map == null) {
      return null;
    }
    const result = {} as TARGET;
    for (const attr of this.attrs) {
      const element = map[attr.key];
      const value = element == null ? undefined : attr.fromDynamo(element);
      if (value !== undefined) {
        attr.setter(result, value);
      } else if (!attr.optional) {
        throw new RequiredValueError(this.typeName, attr.key);
      }
    }
    return result;
  }

  public deserializer(): DynamoDeserializer<PROGRESS extends TARGET ? TARGET : IncompleteDefinition> {
    const self = this;
    return {
      deserialize(map: DynamoDB.AttributeMap | null): TARGET | null {
        return self.deserialize.call(self, map);
      },
    } as any;
  }

  private optionalAccessor<KEY extends string & keyof TARGET, VALUE extends TARGET[KEY]>(
    key: KEY,
  ): (target?: TARGET) => (VALUE | undefined) {
    return (target?: TARGET) => {
      /* istanbul ignore next */
      if (target == null) {
        return undefined;
      }
      const value: VALUE = target[key] as VALUE;
      return value == null ? undefined : value;
    };
  }

  public optionalBool<KEY extends string & keyof TARGET, VALUE extends (boolean | undefined) & TARGET[KEY]>(
    key: KEY,
  ): DynamoParser<TARGET, PROGRESS & { [K in KEY]?: boolean }> {
    this.addAttribute<KEY, VALUE>(
      key,
      true,
      dynamoValue.reader.bool.orUndef as FromDynamo<VALUE>,
      dynamoValue.writer.bool,
    );
    return this as any;
  }

  public optionalDate<KEY extends string & keyof TARGET, VALUE extends (Date | undefined) & TARGET[KEY]>(
    key: KEY,
  ): DynamoParser<TARGET, PROGRESS & { [K in KEY]?: Date }> {
    this.addAttribute<KEY, VALUE>(
      key,
      true,
      dynamoValue.reader.date.orUndef as FromDynamo<VALUE>,
      dynamoValue.writer.date,
    );
    return this;
  }

  public optionalFloat<KEY extends string & keyof TARGET, VALUE extends (number | undefined) & TARGET[KEY]>(
    key: KEY,
  ): DynamoParser<TARGET, PROGRESS & { [K in KEY]?: number }> {
    this.addAttribute<KEY, VALUE>(
      key,
      true,
      dynamoValue.reader.float.orUndef as FromDynamo<VALUE>,
      dynamoValue.writer.float,
    );
    return this as any;
  }

  public optionalInt<KEY extends string & keyof TARGET, VALUE extends (number | undefined) & TARGET[KEY]>(
    key: KEY,
  ): DynamoParser<TARGET, PROGRESS & { [K in KEY]?: number }> {
    this.addAttribute<KEY, VALUE>(
      key,
      true,
      dynamoValue.reader.int.orUndef as FromDynamo<VALUE>,
      dynamoValue.writer.int,
    );
    return this as any;
  }

  private optionalSetter<KEY extends string & keyof TARGET, VALUE extends TARGET[KEY]>(
    key: KEY,
  ): (target: TARGET, value: VALUE | undefined) => void {
    return (t, v) => {
      /* istanbul ignore next */
      if (v != null) {
        t[key] = v;
      }
    };
  }

  public optionalString<KEY extends string & keyof TARGET, VALUE extends (string | undefined) & TARGET[KEY]>(
    key: KEY,
  ): DynamoParser<TARGET, PROGRESS & { [K in KEY]?: string }> {
    this.addAttribute<KEY, VALUE>(
      key,
      true,
      dynamoValue.reader.string.orUndef as FromDynamo<VALUE>,
      dynamoValue.writer.string,
    );
    return this;
  }

  private requiredAccessor<KEY extends string & keyof TARGET, VALUE extends TARGET[KEY]>(
    key: KEY,
  ): (target?: TARGET) => (VALUE | undefined) {
    const typeName = this.typeName;
    return (target?: TARGET) => {
      /* istanbul ignore if */
      if (target == null) {
        /* istanbul ignore next */
        return undefined;
      }
      const value: VALUE = target[key] as VALUE;
      if (value != null) {
        return value;
      }
      throw new RequiredValueError(typeName, key);
    };
  }

  public requiredBool<KEY extends string & keyof TARGET, VALUE extends boolean & NonNullable<TARGET[KEY]>>(
    key: KEY,
  ): DynamoParser<TARGET, PROGRESS & { [K in KEY]: boolean }> {
    this.addAttribute<KEY, VALUE>(
      key,
      false,
      dynamoValue.reader.bool.orThrow(this.typeName, key) as FromDynamo<VALUE>,
      dynamoValue.writer.bool,
    );
    return this as any;
  }

  public requiredDate<KEY extends string & keyof TARGET, VALUE extends Date & NonNullable<TARGET[KEY]>>(
    key: KEY,
  ): DynamoParser<TARGET, PROGRESS & { [K in KEY]: Date }> {
    this.addAttribute<KEY, VALUE>(
      key,
      false,
      dynamoValue.reader.date.orThrow(this.typeName, key) as FromDynamo<VALUE>,
      dynamoValue.writer.date,
    );
    return this as any;
  }

  public requiredFloat<KEY extends string & keyof TARGET, VALUE extends number & NonNullable<TARGET[KEY]>>(
    key: KEY,
  ): DynamoParser<TARGET, PROGRESS & { [K in KEY]: number }> {
    this.addAttribute<KEY, VALUE>(
      key,
      false,
      dynamoValue.reader.float.orThrow(this.typeName, key) as FromDynamo<VALUE>,
      dynamoValue.writer.float,
    );
    return this as any;
  }

  public requiredInt<KEY extends string & keyof TARGET, VALUE extends number & NonNullable<TARGET[KEY]>>(
    key: KEY,
  ): DynamoParser<TARGET, PROGRESS & { [K in KEY]: number }> {
    this.addAttribute<KEY, VALUE>(
      key,
      false,
      dynamoValue.reader.int.orThrow(this.typeName, key) as FromDynamo<VALUE>,
      dynamoValue.writer.int,
    );
    return this as any;
  }

  private requiredSetter<KEY extends string & keyof TARGET, VALUE extends TARGET[KEY]>(
    key: KEY,
  ): (target: TARGET, value: VALUE | undefined) => void {
    return (t, v) => {
      /* istanbul ignore next */
      if (v != null) {
        t[key] = v;
      } else {
        /* istanbul ignore next */
        throw new RequiredValueError(this.typeName, key);
      }
    };
  }

  public requiredString<KEY extends string & keyof TARGET, VALUE extends string & NonNullable<TARGET[KEY]>>(
    key: KEY,
  ): DynamoParser<TARGET, PROGRESS & { [K in KEY]: string }> {
    this.addAttribute<KEY, VALUE>(
      key,
      false,
      dynamoValue.reader.string.orThrow(this.typeName, key) as FromDynamo<VALUE>,
      dynamoValue.writer.string,
    );
    return this as any;
  }

  public serialize(
    object?: TARGET | null,
  ): DynamoDB.AttributeMap | null {
    if (object == null) {
      return null;
    }
    const attrMap: DynamoDB.AttributeMap = {};
    for (const attr of this.attrs) {
      attr.serialize(object, attrMap);
    }
    return attrMap;
  }

  public serializer(): DynamoSerializer<PROGRESS extends TARGET ? TARGET : IncompleteDefinition> {
    const self = this;
    return {
      serialize(object?: TARGET | null): DynamoDB.AttributeMap | null {
        return self.serialize.call(self, object);
      },
    } as any;
  }
}
