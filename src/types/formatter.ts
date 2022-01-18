import type * as Formats from "../impl/formats";

export type InternalFormatObject = {
  D: typeof Formats.DATE_SHORT;
  DD: typeof Formats.DATE_MED;
  DDD: typeof Formats.DATE_FULL;
  DDDD: typeof Formats.DATE_HUGE;
  t: typeof Formats.TIME_SIMPLE;
  tt: typeof Formats.TIME_WITH_SECONDS;
  ttt: typeof Formats.TIME_WITH_SHORT_OFFSET;
  tttt: typeof Formats.TIME_WITH_LONG_OFFSET;
  T: typeof Formats.TIME_24_SIMPLE;
  TT: typeof Formats.TIME_24_WITH_SECONDS;
  TTT: typeof Formats.TIME_24_WITH_SHORT_OFFSET;
  TTTT: typeof Formats.TIME_24_WITH_LONG_OFFSET;
  f: typeof Formats.DATETIME_SHORT;
  ff: typeof Formats.DATETIME_MED;
  fff: typeof Formats.DATETIME_FULL;
  ffff: typeof Formats.DATETIME_HUGE;
  F: typeof Formats.DATETIME_SHORT_WITH_SECONDS;
  FF: typeof Formats.DATETIME_MED_WITH_SECONDS;
  FFF: typeof Formats.DATETIME_FULL_WITH_SECONDS;
  FFFF: typeof Formats.DATETIME_HUGE_WITH_SECONDS;
};

export type IntervalFormatKeys = keyof InternalFormatObject;
export type InternalFormatValues = InternalFormatObject[IntervalFormatKeys];
