import {DynamoAttr} from "./DynamoAttr";

export class RequiredValueError extends Error {
  constructor(
    public readonly typeName: string,
    public readonly attrName: string,
  ) {
    super(`${typeName}.${attrName}`);

    Object.setPrototypeOf(this, RequiredValueError.prototype);
  }
}
