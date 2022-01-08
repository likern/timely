import type DateTime from "./datetime";
import type Duration from "./duration";
import type Invalid from "./impl/invalid";
import type Zone from "./zone";

export type DateLike = DateTime | Date | Object;
export type DurationLike = Duration | Object | number;

export type FormatStyle = "short" | "narrow" | "techie";

export interface Config {
  start?: DateTime;
  end?: DateTime;
  invalid?: Invalid;
}

export interface DateTimeOptions {
  zone: string | Zone;
  setZone: boolean;
  locale: string;
  outputCalendar?: string;
  numberingSystem?: string;
}

export interface FormatOptions {
  format: NonNullable<Intl.DateTimeFormatOptions["timeZoneName"]>;
  locale: string;
}
