import {DynamoDB} from "aws-sdk";

export interface DynamoAttr<PARENT extends { [key: string]: CHILD }, CHILD> {
  accessor: (parent?: PARENT) => CHILD | undefined;
  fromDynamo: (value: DynamoDB.AttributeValue) => CHILD | undefined;
  key: string;
  optional: boolean;
  serialize: (parent: PARENT | undefined, map: DynamoDB.AttributeMap | undefined) => void;
  setter: (parent: PARENT, child?: CHILD) => void;
}
