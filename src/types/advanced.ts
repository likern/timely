import type { InternalFormatValues } from "./formatter";

type Indexable<V> = { [index: string]: V };

export type GetUnionKeys<T> = T extends Indexable<unknown> ? keyof T : never;

export type AddIndexAccessToEveryObjectInUnion<T, J> = T extends { [index: string]: infer V }
  ? J extends { [index: string]: unknown }
    ? { [index: string]: V | undefined } & T
    : never
  : never;

export type A = AddIndexAccessToEveryObjectInUnion<
  InternalFormatValues,
  { [index: string]: unknown }
>;
