# DynamoDB TypeScript Adapter

This package provides very basic serialization and deserialization between DynamoDB types and TS/JS classes.
It works for me, but no attempt has been made to productionize, optimize, verify, validate, or in any other way vet the viability of this code.

_Author:_ [Rick Osborne](https://rickosborne.org)

_Home:_ [npm:dynamo-ts-adapter](https://www.npmjs.com/package/dynamo-ts-adapter)

## Usage

Presuming some interface:

```typescript
interface Widget {
  name: string;
  price: number;
  sale: boolean;
  description?: string;
  notBefore?: Date;
}
```

Create a parser:

```typescript
const parser = new DynamoParser<Widget>('Widget')
    .requiredString('name')
    .requiredFloat('price')
    .requiredBool('sale')
    .optionalString('description')
    .optionalDate('notBefore');
```

From that parser you can get a deserializer that can read DynamoDB AttributeMaps:

```typescript
const reader = parser.deserializer();
const widget = reader.deserialize(attributeMap);  // Widget
```

Similarly, you can create AttributeMaps from your value objects:

```typescript
const writer = parser.serializer();
const map = writer.serialize(widget);  // DynamoDB.AttributeMap
```

That's pretty much it.

## Caution

There's some type chicanery to do compile-time checking of parser coverage of an interface.
If you get an inferred parser type of `DynamoParser<void>` you've either got some mismatch between type and/or required/optional for a field, or you haven't covered all fields in your interface.
If you have an interface that can't strictly be matched, you'll need to `as` typecast your parser to tell the compiler to ignore it.
 
