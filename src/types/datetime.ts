import type Invalid from "../impl/invalid";
import type Zone from "../zone";

export interface DateTimeConfig {
  ts: number;
  zone: string | Zone;
  invalid: Invalid;
  old: DateTimeConfig;
}

export interface DateTimeJSObject {
  year: number;
  month: number;
  day: number;
  ordinal: number;
  weekYear: number;
  weekNumber: number;
  weekday: number;
  hour: number;
  minute: number;
  second: number;
  millisecond: number;
}

export interface DateTimeOptions {
  zone: string | Zone;
  setZone: boolean;
  locale: string;
  outputCalendar?: string;
  numberingSystem?: string;
}

export interface DateTimeToISOOptions {
  format?: string;
  suppressSeconds?: boolean;
  suppressMilliseconds?: boolean;
  includeOffset?: boolean;
}

export type DateTimeLocalArguments = [
  year?: number,
  month?: number,
  day?: number,
  hour?: number,
  minute?: number,
  second?: number,
  millisecond?: number,
  opts?: number | DateTimeOptions
];

export type DateTimeUnitsTuple = [
  "year",
  "month",
  "day",
  "hour",
  "minute",
  "second",
  "millisecond"
];

export type DateTimeUnitsUnion = DateTimeUnitsTuple[number];

export type DateTimeUnitsObject = {
  [key in DateTimeUnitsUnion]: number;
};

export type DateTimeWeekUnitsTuple = [
  "weekYear",
  "weekNumber",
  "weekday",
  "hour",
  "minute",
  "second",
  "millisecond"
];
export type DateTimeOrdinalUnitsTuple = [
  "year",
  "ordinal",
  "hour",
  "minute",
  "second",
  "millisecond"
];
export type DateTimeSingularUnitsTuple = [
  "year",
  "month",
  "day",
  "hour",
  "minute",
  "quarter",
  "second",
  "millisecond",
  "weekday",
  "weekNumber",
  "weekYear",
  "ordinal"
];

export type DateTimeSingularUnitsUnion = DateTimeSingularUnitsTuple[number];
