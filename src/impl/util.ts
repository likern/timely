/*
  This is just a junk drawer, containing anything used across multiple classes.
  Because Luxon is small(ish), this should stay small and we won't worry about splitting
  it up into, say, parsingUtil.js and basicUtil.js and so on. But they are divided up by feature area.
*/

import type DateTime from "../datetime";
import { InvalidArgumentError } from "../errors";
import type { PluralUnitsArray, PluralUnitsObject, FormatOptions, FormatStyle } from "../types";

/**
 * @private
 */

// Type predicates

export function isUndefined(o: unknown): o is undefined {
  return typeof o === "undefined";
}

export function isNumber(o: unknown): o is number {
  return typeof o === "number";
}

export function isInteger(o: unknown): o is number {
  return typeof o === "number" && o % 1 === 0;
}

export function isString(o: unknown): o is string {
  return typeof o === "string";
}

export function isDate(o: object): o is Date {
  return Object.prototype.toString.call(o) === "[object Date]";
}

// CAPABILITIES

export function hasRelative() {
  try {
    return typeof Intl !== "undefined" && !!Intl.RelativeTimeFormat;
  } catch (e) {
    return false;
  }
}

// OBJECTS AND ARRAYS

export function maybeArray(thing: unknown) {
  return Array.isArray(thing) ? thing : [thing];
}

export function bestBy(
  arr: DateTime[],
  by: (dt: DateTime) => number,
  compare: (...values: number[]) => number
) {
  if (arr.length === 0) {
    return undefined;
  }

  const initialObject: [number, DateTime] | null = null;
  // @ts-expect-error Can't make correct types
  const reduced = arr.reduce((best, next) => {
    const pair: [number, DateTime] = [by(next), next];
    if (!best) {
      return pair;
    } else if (compare(best[0], pair[0]) === best[0]) {
      return best;
    } else {
      return pair;
    }
  }, initialObject);
  // @ts-expect-error Can't make correct types
  return reduced[1] as DateTime;
}

export function pick(obj: { [index: string]: number }, keys: string[]) {
  const initialObj: { [index: string]: number } = {};
  return keys.reduce((a, k) => {
    a[k] = obj[k];
    return a;
  }, initialObj);
}

export function hasOwnProperty(obj: object, prop: string) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

// NUMBERS AND STRINGS

export function integerBetween(thing: unknown, bottom: number, top: number): thing is number {
  return isInteger(thing) && thing >= bottom && thing <= top;
}

// x % n but takes the sign of n instead of x
export function floorMod(x: number, n: number) {
  return x - n * Math.floor(x / n);
}

export function padStart(input: number, n = 2) {
  const isNeg = input < 0;
  let padded;
  if (isNeg) {
    padded = "-" + ("" + -input).padStart(n, "0");
  } else {
    padded = ("" + input).padStart(n, "0");
  }
  return padded;
}

export function parseInteger(string: undefined): undefined;
export function parseInteger(string: null): undefined;
export function parseInteger(string: ""): undefined;
export function parseInteger(string: string): number;
export function parseInteger(string: any) {
  if (isUndefined(string) || string === null || string === "") {
    return undefined;
  } else {
    return parseInt(string, 10);
  }
}

export function parseFloating(string: string | undefined | null) {
  if (isUndefined(string) || string === null || string === "") {
    return undefined;
  } else {
    return parseFloat(string);
  }
}

export function parseMillis(fraction: string | null | undefined) {
  // Return undefined (instead of 0) in these cases, where fraction is not set
  if (isUndefined(fraction) || fraction === null || fraction === "") {
    return undefined;
  } else {
    const f = parseFloat("0." + fraction) * 1000;
    return Math.floor(f);
  }
}

export function roundTo(number: number, digits: number, towardZero = false) {
  const factor = 10 ** digits;
  const rounder = towardZero ? Math.trunc : Math.round;
  return rounder(number * factor) / factor;
}

// DATE BASICS

export function isLeapYear(year: number) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

export function daysInYear(year: number) {
  return isLeapYear(year) ? 366 : 365;
}

export function daysInMonth(year: number, month: number) {
  const modMonth = floorMod(month - 1, 12) + 1;
  const modYear = year + (month - modMonth) / 12;

  if (modMonth === 2) {
    return isLeapYear(modYear) ? 29 : 28;
  } else {
    return [31, null, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][modMonth - 1] as number;
  }
}

// covert a calendar object to a local timestamp (epoch, but with the offset baked in)
export function objToLocalTS(obj: {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  millisecond: number;
}) {
  return Date.UTC(
    obj.year,
    obj.month - 1,
    obj.day,
    obj.hour,
    obj.minute,
    obj.second,
    obj.millisecond
  );

  // for legacy reasons, years between 0 and 99 are interpreted as 19XX; revert that
  // FIXME: Can we completely delete this legacy code? Do we need it?
  // if (obj.year < 100 && obj.year >= 0) {
  //   d = new Date(d);
  //   d.setUTCFullYear(d.getUTCFullYear() - 1900);
  // }
}

export function weeksInWeekYear(weekYear: number) {
  const p1 =
      (weekYear +
        Math.floor(weekYear / 4) -
        Math.floor(weekYear / 100) +
        Math.floor(weekYear / 400)) %
      7,
    last = weekYear - 1,
    p2 = (last + Math.floor(last / 4) - Math.floor(last / 100) + Math.floor(last / 400)) % 7;
  return p1 === 4 || p2 === 3 ? 53 : 52;
}

export function untruncateYear(year: number) {
  if (year > 99) {
    return year;
  } else return year > 60 ? 1900 + year : 2000 + year;
}

// PARSING

export function parseZoneInfo(
  ts: number,
  offsetFormat: FormatOptions["format"],
  locale: FormatOptions["locale"],
  timeZone: string | null = null
) {
  const date = new Date(ts);
  const intlOpts: Intl.DateTimeFormatOptions = {
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  };

  if (timeZone) {
    intlOpts.timeZone = timeZone;
  }

  const modified = { timeZoneName: offsetFormat, ...intlOpts };

  const parsed = new Intl.DateTimeFormat(locale, modified)
    .formatToParts(date)
    .find((m) => m.type.toLowerCase() === "timezonename");
  return parsed ? parsed.value : null;
}

// signedOffset('-5', '30') -> -330
export function signedOffset(offHourStr: string, offMinuteStr: string) {
  let offHour = parseInt(offHourStr, 10);

  // don't || this because we want to preserve -0
  if (Number.isNaN(offHour)) {
    offHour = 0;
  }

  const offMin = parseInt(offMinuteStr, 10) || 0,
    offMinSigned = offHour < 0 || Object.is(offHour, -0) ? -offMin : offMin;
  return offHour * 60 + offMinSigned;
}

// COERCION

export function asNumber(value: unknown) {
  const numericValue = Number(value);
  if (typeof value === "boolean" || value === "" || Number.isNaN(numericValue))
    throw new InvalidArgumentError(`Invalid unit value ${value}`);
  return numericValue;
}

export function normalizeObject(
  obj: { [index: string]: unknown },
  normalizer: (unit: string) => PluralUnitsArray[number]
) {
  const normalized: Partial<PluralUnitsObject> = {};
  for (const u in obj) {
    if (hasOwnProperty(obj, u)) {
      const v = obj[u];
      if (v === undefined || v === null) {
        continue;
      }
      normalized[normalizer(u)] = asNumber(v);
    }
  }
  return normalized;
}

export function formatOffset(offset: number, format: FormatStyle) {
  const hours = Math.trunc(Math.abs(offset / 60)),
    minutes = Math.trunc(Math.abs(offset % 60)),
    sign = offset >= 0 ? "+" : "-";

  switch (format) {
    case "short":
      return `${sign}${padStart(hours, 2)}:${padStart(minutes, 2)}`;
    case "narrow":
      return `${sign}${hours}${minutes > 0 ? `:${minutes}` : ""}`;
    case "techie":
      return `${sign}${padStart(hours, 2)}${padStart(minutes, 2)}`;
    default:
      throw new RangeError(`Value format ${format} is out of range for property format`);
  }
}

export function timeObject(obj: { [index: string]: number }): {
  hour: number;
  minute: number;
  second: number;
  millisecond: number;
} {
  // @ts-expect-error pick function returns wide object type; can we fix it?
  return pick(obj, ["hour", "minute", "second", "millisecond"]);
}

export const ianaRegex = /[A-Za-z_+-]{1,256}(:?\/[A-Za-z0-9_+-]{1,256}(\/[A-Za-z0-9_+-]{1,256})?)?/;
