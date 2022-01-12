import type DateTime from "./datetime";
import type Duration from "./duration";
import type Invalid from "./impl/invalid";
import type Locale from "./impl/locale";
import type Zone from "./zone";

export type Reverse<T extends any[], R extends any[] = []> = ReturnType<
  T extends [infer F, ...infer L] ? () => Reverse<L, [F, ...R]> : () => R
>;

export type DateLike = DateTime | Date | Object;
export type DurationLike = Duration | PluralUnitsObject | number;

export type FormatStyle = "short" | "narrow" | "techie";

export interface Config {
  start: DateTime;
  end: DateTime;
  invalid?: Invalid;
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

export interface DurationFormatOptions {
  round: boolean;
  floor: boolean;
}

export interface DurationConfig {
  // accurate?: boolean;
  values: Partial<PluralUnitsObject>;
  loc: Locale;
  conversionAccuracy: "longterm" | "casual";
  invalid?: Invalid | null;
  matrix?: DurationMatrix;
  isLuxonDuration?: boolean;
}

export type UnitsArray = [
  "year",
  "years",
  "quarter",
  "quarters",
  "month",
  "months",
  "week",
  "weeks",
  "day",
  "days",
  "hour",
  "hours",
  "minute",
  "minutes",
  "second",
  "seconds",
  "millisecond",
  "milliseconds"
];

export type Units = UnitsArray[number];

export type UnitsObject = {
  [key in Units]: number;
};

export type PluralUnitsArray = [
  "years",
  "quarters",
  "months",
  "weeks",
  "days",
  "hours",
  "minutes",
  "seconds",
  "milliseconds"
];

export type PluralUnits = PluralUnitsArray[number];

export type PluralUnitsObject = {
  [key in PluralUnits]: number;
};

export interface DurationOptions {
  locale?: string;
  numberingSystem?: string;
  conversionAccuracy?: "longterm" | "casual";
}

export interface DurationLowOrderMatrix {
  weeks: {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    milliseconds: number;
  };
  days: {
    hours: number;
    minutes: number;
    seconds: number;
    milliseconds: number;
  };
  hours: { minutes: number; seconds: number; milliseconds: number };
  minutes: { seconds: number; milliseconds: number };
  seconds: { milliseconds: number };
}

export interface DurationCasualMatrix extends DurationLowOrderMatrix {
  years: {
    quarters: number;
    months: number;
    weeks: number;
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    milliseconds: number;
  };
  quarters: {
    months: number;
    weeks: number;
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    milliseconds: number;
  };
  months: {
    weeks: number;
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    milliseconds: number;
  };
}

export interface DurationAccurateMatrix extends DurationCasualMatrix, DurationLowOrderMatrix {}

export type DurationMatrix = DurationCasualMatrix | DurationAccurateMatrix;

export interface InfoMonthsOptions {
  locale?: string | null;
  numberingSystem?: string | null;
  locObj?: object | null;
  outputCalendar?: string;
}

export interface FormatOptions {
  format: NonNullable<Intl.DateTimeFormatOptions["timeZoneName"]>;
  locale: string;
}
