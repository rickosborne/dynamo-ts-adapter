import {DynamoDB} from "aws-sdk";

export interface DynamoDeserializer<T> {
  deserialize(map: DynamoDB.AttributeMap | null): T | null;
}
