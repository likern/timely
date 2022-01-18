import { formatOffset, parseZoneInfo, isUndefined, objToLocalTS } from "../impl/util";
import Zone from "../zone";
import { LuxonError } from "../errors.js";

import type { FormatOptions, FormatStyle } from "../types";

const dtfCache = new Map<string, Intl.DateTimeFormat>();

function makeDTF(zone: string) {
  const value = dtfCache.get(zone);
  if (value === undefined) {
    const dtf = new Intl.DateTimeFormat("en-US", {
      hour12: false,
      timeZone: zone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    dtfCache.set(zone, dtf);
    return dtf;
  }
  return value;
}

const typeToPos = new Map<string, number>(
  Object.entries({
    year: 0,
    month: 1,
    day: 2,
    hour: 3,
    minute: 4,
    second: 5,
  })
);

function hackyOffset(dtf: Intl.DateTimeFormat, date: Date) {
  const formatted = dtf.format(date).replace(/\u200E/g, "");
  const parsed = /(\d+)\/(\d+)\/(\d+),? (\d+):(\d+):(\d+)/.exec(formatted);

  if (parsed === null) {
    // FIXME: Should we use custom error type?
    throw new LuxonError(`Can't parse string "${formatted}" into parts`);
  }

  const [, fMonth, fDay, fYear, fHour, fMinute, fSecond] = parsed;
  const result = [
    Number(fYear),
    Number(fMonth),
    Number(fDay),
    Number(fHour),
    Number(fMinute),
    Number(fSecond),
  ];

  result.forEach((it) => {
    if (Number.isNaN(it)) {
      /**
       * Found invalid conversion from string to number, got NaN.
       */
      throw new LuxonError(
        `Can't convert parts of string "${formatted}" into numbers, some part was converted to NaN`
      );
    }
  });

  return result;
}

function partsOffset(dtf: Intl.DateTimeFormat, date: Date) {
  const formatted = dtf.formatToParts(date);
  const filled: number[] = [];

  for (let i = 0; i < formatted.length; i++) {
    const { type, value } = formatted[i];
    const pos = typeToPos.get(type);

    if (!isUndefined(pos)) {
      filled[pos] = parseInt(value, 10);
    }
  }
  return filled;
}

const ianaZoneCache = new Map<string, IANAZone>();

/**
 * A zone identified by an IANA identifier, like America/New_York
 * @implements {Zone}
 */
export default class IANAZone extends Zone {
  zoneName: string;
  valid: boolean;

  /**
   * @param {string} name - Zone name
   * @return {IANAZone}
   */
  static create(name: string): IANAZone {
    const value = ianaZoneCache.get(name);
    if (value === undefined) {
      const ianaZone = new IANAZone(name);
      ianaZoneCache.set(name, ianaZone);
      return ianaZone;
    }
    return value;
  }

  /**
   * Reset local caches. Should only be necessary in testing scenarios.
   * @return {void}
   */
  static resetCache() {
    ianaZoneCache.clear();
    dtfCache.clear();
  }

  /**
   * Returns whether the provided string is a valid specifier. This only checks the string's format, not that the specifier identifies a known zone; see isValidZone for that.
   * @param {string} s - The string to check validity on
   * @example IANAZone.isValidSpecifier("America/New_York") //=> true
   * @example IANAZone.isValidSpecifier("Sport~~blorp") //=> false
   * @deprecated This method returns false some valid IANA names. Use isValidZone instead
   * @return {boolean}
   */
  static isValidSpecifier(s: string) {
    return this.isValidZone(s);
  }

  /**
   * Returns whether the provided string identifies a real zone
   * @param {string} zone - The string to check
   * @example IANAZone.isValidZone("America/New_York") //=> true
   * @example IANAZone.isValidZone("Fantasia/Castle") //=> false
   * @example IANAZone.isValidZone("Sport~~blorp") //=> false
   * @return {boolean}
   */
  static isValidZone(zone: string) {
    if (zone.length === 0) {
      return false;
    }
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: zone }).format();
      return true;
    } catch (e) {
      return false;
    }
  }

  constructor(name: string) {
    super();
    /** @private **/
    this.zoneName = name;
    /** @private **/
    this.valid = IANAZone.isValidZone(name);
  }

  /** @override **/
  get type() {
    return "iana";
  }

  /** @override **/
  get name() {
    return this.zoneName;
  }

  /** @override **/
  get isUniversal() {
    return false;
  }

  /** @override **/
  offsetName(ts: number, { format, locale }: FormatOptions) {
    return parseZoneInfo(ts, format, locale, this.name);
  }

  /** @override **/
  formatOffset(ts: number, format: FormatStyle) {
    return formatOffset(this.offset(ts), format);
  }

  /** @override **/
  offset(ts: number) {
    const date = new Date(ts);

    if (isNaN(date.valueOf())) {
      return NaN;
    }

    const dtf = makeDTF(this.name);

    // @ts-expect-error Do we check here formatToParts method existence?
    const [year, month, day, hour, minute, second] = dtf.formatToParts
      ? partsOffset(dtf, date)
      : hackyOffset(dtf, date);

    // because we're using hour12 and https://bugs.chromium.org/p/chromium/issues/detail?id=1025564&can=2&q=%2224%3A00%22%20datetimeformat
    const adjustedHour = hour === 24 ? 0 : hour;

    const asUTC = objToLocalTS({
      year,
      month,
      day,
      hour: adjustedHour,
      minute,
      second,
      millisecond: 0,
    });

    let asTS = date.valueOf();
    const over = asTS % 1000;
    asTS -= over >= 0 ? over : 1000 + over;
    return (asUTC - asTS) / (60 * 1000);
  }

  /** @override **/
  equals(otherZone: Zone) {
    return otherZone.type === "iana" && otherZone.name === this.name;
  }

  /** @override **/
  get isValid() {
    return this.valid;
  }
}
