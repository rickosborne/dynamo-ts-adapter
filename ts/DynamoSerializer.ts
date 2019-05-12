import {DynamoDB} from "aws-sdk";

export interface DynamoSerializer<T> {
  serialize(object?: T | null): DynamoDB.AttributeMap | null;
}
