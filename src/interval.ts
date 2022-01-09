import DateTime, { friendlyDateTime } from "./datetime";
import Duration from "./duration";
import Settings from "./settings";
import { InvalidArgumentError, InvalidIntervalError } from "./errors";
import Invalid from "./impl/invalid";

import type {
  Config,
  DateLike,
  DateTimeOptions,
  DateTimeToISOOptions,
  DurationLike,
} from "./types";

const INVALID = "Invalid Interval";

// checks if the start is equal to or before the end
function validateStartEnd(start: DateTime, end: DateTime) {
  if (!start || !start.isValid) {
    return Interval.invalid("missing or invalid start");
  } else if (!end || !end.isValid) {
    return Interval.invalid("missing or invalid end");
  } else if (end < start) {
    return Interval.invalid(
      "end before start",
      `The end of an interval must be after its start, but you had start=${start.toISO()} and end=${end.toISO()}`
    );
  } else {
    return null;
  }
}

/**
 * An Interval object represents a half-open interval of time, where each endpoint is a {@link DateTime}. Conceptually, it's a container for those two endpoints, accompanied by methods for creating, parsing, interrogating, comparing, transforming, and formatting them.
 *
 * Here is a brief overview of the most commonly used methods and getters in Interval:
 *
 * * **Creation** To create an Interval, use {@link Interval#fromDateTimes}, {@link Interval#after}, {@link Interval#before}, or {@link Interval#fromISO}.
 * * **Accessors** Use {@link Interval#start} and {@link Interval#end} to get the start and end.
 * * **Interrogation** To analyze the Interval, use {@link Interval#count}, {@link Interval#length}, {@link Interval#hasSame}, {@link Interval#contains}, {@link Interval#isAfter}, or {@link Interval#isBefore}.
 * * **Transformation** To create other Intervals out of this one, use {@link Interval#set}, {@link Interval#splitAt}, {@link Interval#splitBy}, {@link Interval#divideEqually}, {@link Interval#merge}, {@link Interval#xor}, {@link Interval#union}, {@link Interval#intersection}, or {@link Interval#difference}.
 * * **Comparison** To compare this Interval to another one, use {@link Interval#equals}, {@link Interval#overlaps}, {@link Interval#abutsStart}, {@link Interval#abutsEnd}, {@link Interval#engulfs}
 * * **Output** To convert the Interval into other representations, see {@link Interval#toString}, {@link Interval#toISO}, {@link Interval#toISODate}, {@link Interval#toISOTime}, {@link Interval#toFormat}, and {@link Interval#toDuration}.
 */
export default class Interval {
  s: DateTime;
  e: DateTime;
  invalid: Invalid | null;
  isLuxonInterval: boolean;

  /**
   * @private
   */
  constructor(config: Config) {
    /**
     * @access private
     */
    this.s = config.start;
    /**
     * @access private
     */
    this.e = config.end;
    /**
     * @access private
     */
    this.invalid = config.invalid || null;
    /**
     * @access private
     */
    this.isLuxonInterval = true;
  }

  /**
   * Create an invalid Interval.
   * @param {string} reason - simple string of why this Interval is invalid. Should not contain parameters or anything else data-dependent
   * @param {string} [explanation=null] - longer explanation, may include parameters and other useful debugging information
   * @return {Interval}
   */
  static invalid(reason: string | Invalid, explanation: string | null = null) {
    if (!reason) {
      throw new InvalidArgumentError("need to specify a reason the Interval is invalid");
    }

    const invalid = reason instanceof Invalid ? reason : new Invalid(reason, explanation);

    if (Settings.throwOnInvalid) {
      throw new InvalidIntervalError(invalid);
    } else {
      // @ts-expect-error
      return new Interval({ invalid });
    }
  }

  /**
   * Create an Interval from a start DateTime and an end DateTime. Inclusive of the start but not the end.
   * @param {DateTime|Date|Object} start
   * @param {DateTime|Date|Object} end
   * @return {Interval}
   */
  static fromDateTimes(start: DateLike, end: DateLike) {
    const builtStart = friendlyDateTime(start),
      builtEnd = friendlyDateTime(end);

    const validateError = validateStartEnd(builtStart, builtEnd);

    if (validateError == null) {
      return new Interval({
        start: builtStart,
        end: builtEnd,
      });
    } else {
      return validateError;
    }
  }

  /**
   * Create an Interval from a start DateTime and a Duration to extend to.
   * @param {DateTime|Date|Object} start
   * @param {Duration|Object|number} duration - the length of the Interval.
   * @return {Interval}
   */
  static after(start: DateLike, duration: DurationLike) {
    const dur = Duration.fromDurationLike(duration),
      dt = friendlyDateTime(start);
    return Interval.fromDateTimes(dt, dt.plus(dur));
  }

  /**
   * Create an Interval from an end DateTime and a Duration to extend backwards to.
   * @param {DateTime|Date|Object} end
   * @param {Duration|Object|number} duration - the length of the Interval.
   * @return {Interval}
   */
  static before(end: DateLike, duration: DurationLike) {
    const dur = Duration.fromDurationLike(duration),
      dt = friendlyDateTime(end);
    return Interval.fromDateTimes(dt.minus(dur), dt);
  }

  /**
   * Create an Interval from an ISO 8601 string.
   * Accepts `<start>/<end>`, `<start>/<duration>`, and `<duration>/<end>` formats.
   * @param {string} text - the ISO string to parse
   * @param {Object} [opts] - options to pass {@link DateTime#fromISO} and optionally {@link Duration#fromISO}
   * @see https://en.wikipedia.org/wiki/ISO_8601#Time_intervals
   * @return {Interval}
   */
  static fromISO(text: string, opts: DateTimeOptions) {
    const [s, e] = (text || "").split("/", 2);
    if (s && e) {
      try {
        const start = DateTime.fromISO(s, opts);
        const end = DateTime.fromISO(e, opts);

        if (start.isValid && end.isValid) {
          return Interval.fromDateTimes(start, end);
        } else if (start.isValid && !end.isValid) {
          const dur = Duration.fromISO(e, opts);
          if (dur.isValid) {
            return Interval.after(start, dur);
          }
        } else if (!start.isValid && end.isValid) {
          const dur = Duration.fromISO(s, opts);
          if (dur.isValid) {
            return Interval.before(end, dur);
          }
        }
      } catch (e) {}
    }
    return Interval.invalid("unparsable", `the input "${text}" can't be parsed as ISO 8601`);
  }

  /**
   * Check if an object is an Interval. Works across context boundaries
   * @param {object} o
   * @return {boolean}
   */
  static isInterval(o: object & { isLuxonInterval?: boolean }) {
    return (o && o.isLuxonInterval) || false;
  }

  /**
   * Returns the start of the Interval
   * @type {DateTime}
   */
  get start() {
    return this.isValid ? this.s : null;
  }

  /**
   * Returns the end of the Interval
   * @type {DateTime}
   */
  get end() {
    return this.isValid ? this.e : null;
  }

  /**
   * Returns whether this Interval's end is at least its start, meaning that the Interval isn't 'backwards'.
   * @type {boolean}
   */
  get isValid() {
    return this.invalidReason === null;
  }

  /**
   * Returns an error code if this Interval is invalid, or null if the Interval is valid
   * @type {string}
   */
  get invalidReason() {
    return this.invalid ? this.invalid.reason : null;
  }

  /**
   * Returns an explanation of why this Interval became invalid, or null if the Interval is valid
   * @type {string}
   */
  get invalidExplanation() {
    return this.invalid ? this.invalid.explanation : null;
  }

  /**
   * Returns the length of the Interval in the specified unit.
   * @param {string} unit - the unit (such as 'hours' or 'days') to return the length in.
   * @return {number}
   */
  length(unit = "milliseconds") {
    const durationUnit: [string] = [unit];
    return this.isValid ? this.toDuration(...durationUnit).get(unit) : NaN;
  }

  /**
   * Returns the count of minutes, hours, days, months, or years included in the Interval, even in part.
   * Unlike {@link Interval#length} this counts sections of the calendar, not periods of time, e.g. specifying 'day'
   * asks 'what dates are included in this interval?', not 'how many days long is this interval?'
   * @param {string} [unit='milliseconds'] - the unit of time to count.
   * @return {number}
   */
  count(unit = "milliseconds") {
    if (!this.isValid) {
      return NaN;
    } else if (this.start === null || this.start === undefined) {
      return NaN;
    } else if (this.end === null || this.end === undefined) {
      return NaN;
    }

    const start = this.start.startOf(unit);
    const end = this.end.startOf(unit);
    return Math.floor(end.diff(start, unit).get(unit)) + 1;
  }

  /**
   * Returns whether this Interval's start and end are both in the same unit of time
   * @param {string} unit - the unit of time to check sameness on
   * @return {boolean}
   */
  hasSame(unit: string) {
    if (this.s === undefined || this.e === undefined) {
      return false;
    }
    return this.isValid ? this.isEmpty() || this.e.minus(1).hasSame(this.s, unit) : false;
  }

  /**
   * FIXME: What to do if this.s or this.e is undefined (ie when invalid interval?)
   * Return whether this Interval has the same start and end DateTimes.
   * @return {boolean}
   */
  isEmpty() {
    if (this.s === undefined || this.e === undefined) {
      return false;
    }
    return this.s.valueOf() === this.e.valueOf();
  }

  /**
   * FIXME: What to do if this.s or this.e is undefined (ie when invalid interval?)
   * Return whether this Interval's start is after the specified DateTime.
   * @param {DateTime} dateTime
   * @return {boolean}
   */
  isAfter(dateTime: DateTime) {
    if (!this.isValid || this.s === undefined) {
      return false;
    }
    return this.s > dateTime;
  }

  /**
   * Return whether this Interval's end is before the specified DateTime.
   * @param {DateTime} dateTime
   * @return {boolean}
   */
  isBefore(dateTime: DateTime) {
    if (!this.isValid || this.e === undefined) {
      return false;
    }
    return this.e <= dateTime;
  }

  /**
   * Return whether this Interval contains the specified DateTime.
   * @param {DateTime} dateTime
   * @return {boolean}
   */
  contains(dateTime: DateTime) {
    if (!this.isValid || this.s === undefined || this.e === undefined) {
      return false;
    }
    return this.s <= dateTime && this.e > dateTime;
  }

  /**
   * "Sets" the start and/or end dates. Returns a newly-constructed Interval.
   * @param {Object} values - the values to set
   * @param {DateTime} values.start - the starting DateTime
   * @param {DateTime} values.end - the ending DateTime
   * @return {Interval}
   */
  set(values: { start?: DateTime; end?: DateTime } = {}) {
    if (!this.isValid) {
      return this;
    }

    if (values.start !== undefined && values.end !== undefined) {
      return Interval.fromDateTimes(values.start, values.end);
    } else if (values.start === undefined && values.end !== undefined) {
      if (this.s !== undefined) {
        return Interval.fromDateTimes(this.s, values.end);
      } else {
        return Interval.invalid("missing or invalid start");
      }
    } else if (values.start !== undefined && values.end === undefined) {
      if (this.e !== undefined) {
        return Interval.fromDateTimes(values.start, this.e);
      } else {
        return Interval.invalid("missing or invalid end");
      }
    }
    return Interval.invalid("both start and end are missing");
  }

  /**
   * Split this Interval at each of the specified DateTimes
   * @param {...DateTime} dateTimes - the unit of time to count.
   * @return {Array}
   */
  splitAt(...dateTimes: DateTime[]) {
    if (!this.isValid || this.s === undefined || this.e === undefined) {
      return [];
    }

    const sorted = dateTimes
      .map(friendlyDateTime)
      .filter((d) => this.contains(d))
      .sort();
    const results = [];
    let i = 0;

    while (this.s < this.e) {
      const added = sorted[i] || this.e;
      const next = +added > +this.e ? this.e : added;
      results.push(Interval.fromDateTimes(this.s, next));
      this.s = next;
      i += 1;
    }

    return results;
  }

  /**
   * Split this Interval into smaller Intervals, each of the specified length.
   * Left over time is grouped into a smaller interval
   * @param {Duration|Object|number} duration - The length of each resulting interval.
   * @return {Array}
   */
  splitBy(duration: DurationLike) {
    const dur = Duration.fromDurationLike(duration);

    if (
      !this.isValid ||
      this.s === undefined ||
      this.e === undefined ||
      !dur.isValid ||
      dur.as("milliseconds") === 0
    ) {
      return [];
    }

    let idx = 1;
    let next;

    const results = [];
    while (this.s < this.e) {
      // @ts-expect-error
      const added = this.s.plus(dur.mapUnits((x) => x * idx));
      next = +added > +this.e ? this.e : added;
      results.push(Interval.fromDateTimes(this.s, next));
      this.s = next;
      idx += 1;
    }

    return results;
  }

  /**
   * Split this Interval into the specified number of smaller intervals.
   * @param {number} numberOfParts - The number of Intervals to divide the Interval into.
   * @return {Array}
   */
  divideEqually(numberOfParts: number) {
    if (!this.isValid) return [];
    return this.splitBy(this.length() / numberOfParts).slice(0, numberOfParts);
  }

  /**
   * Return whether this Interval overlaps with the specified Interval
   * @param {Interval} other
   * @return {boolean}
   */
  overlaps(other: Interval) {
    if (
      this.s === undefined ||
      this.e === undefined ||
      other.s === undefined ||
      other.e === undefined
    ) {
      return false;
    }
    return this.e > other.s && this.s < other.e;
  }

  /**
   * Return whether this Interval's end is adjacent to the specified Interval's start.
   * @param {Interval} other
   * @return {boolean}
   */
  abutsStart(other: Interval) {
    if (!this.isValid || this.e === undefined || other.s === undefined) {
      return false;
    }
    return +this.e === +other.s;
  }

  /**
   * Return whether this Interval's start is adjacent to the specified Interval's end.
   * @param {Interval} other
   * @return {boolean}
   */
  abutsEnd(other: Interval) {
    if (!this.isValid || this.s === undefined || other.e === undefined) {
      return false;
    }
    return +other.e === +this.s;
  }

  /**
   * Return whether this Interval engulfs the start and end of the specified Interval.
   * @param {Interval} other
   * @return {boolean}
   */
  engulfs(other: Interval) {
    if (
      !this.isValid ||
      this.s === undefined ||
      this.e === undefined ||
      other.s === undefined ||
      other.e === undefined
    ) {
      return false;
    }
    return this.s <= other.s && this.e >= other.e;
  }

  /**
   * Return whether this Interval has the same start and end as the specified Interval.
   * @param {Interval} other
   * @return {boolean}
   */
  equals(other: Interval) {
    if (!this.isValid || !other.isValid || this.s === undefined || this.e === undefined) {
      return false;
    }

    return this.s.equals(other.s) && this.e.equals(other.e);
  }

  /**
   * Return an Interval representing the intersection of this Interval and the specified Interval.
   * Specifically, the resulting Interval has the maximum start time and the minimum end time of the two Intervals.
   * Returns null if the intersection is empty, meaning, the intervals don't intersect.
   * @param {Interval} other
   * @return {Interval}
   */
  intersection(other: Interval) {
    if (
      !this.isValid ||
      this.s === undefined ||
      this.e === undefined ||
      other.s === undefined ||
      other.e === undefined
    ) {
      return this;
    }
    const s = this.s > other.s ? this.s : other.s,
      e = this.e < other.e ? this.e : other.e;

    if (s >= e) {
      return null;
    } else {
      return Interval.fromDateTimes(s, e);
    }
  }

  /**
   * Return an Interval representing the union of this Interval and the specified Interval.
   * Specifically, the resulting Interval has the minimum start time and the maximum end time of the two Intervals.
   * @param {Interval} other
   * @return {Interval}
   */
  union(other: Interval) {
    if (
      !this.isValid ||
      this.s === undefined ||
      this.e === undefined ||
      other.s === undefined ||
      other.e === undefined
    ) {
      return this;
    }
    const s = this.s < other.s ? this.s : other.s,
      e = this.e > other.e ? this.e : other.e;
    return Interval.fromDateTimes(s, e);
  }

  /**
   * Merge an array of Intervals into a equivalent minimal set of Intervals.
   * Combines overlapping and adjacent Intervals.
   * @param {Array} intervals
   * @return {Array}
   */
  static merge(intervals: Interval[]) {
    const initialValues: [Interval[], Interval | null] = [[], null];
    const [found, final] = intervals
      .sort((a, b) => a.s.valueOf() - b.s.valueOf())
      .reduce(([sofar, current], item) => {
        if (!current) {
          return [sofar, item];
        } else if (current.overlaps(item) || current.abutsStart(item)) {
          return [sofar, current.union(item)];
        } else {
          return [sofar.concat([current]), item];
        }
      }, initialValues);
    if (final) {
      found.push(final);
    }
    return found;
  }

  /**
   * Return an array of Intervals representing the spans of time that only appear in one of the specified Intervals.
   * @param {Array} intervals
   * @return {Array}
   */
  static xor(intervals: Interval[]) {
    let start = null,
      currentCount = 0;
    const results = [],
      ends = intervals.map((i) => [
        { time: i.s, type: "s" },
        { time: i.e, type: "e" },
      ]),
      flattened = Array.prototype.concat(...ends),
      arr = flattened.sort((a, b) => a.time - b.time);

    for (const i of arr) {
      currentCount += i.type === "s" ? 1 : -1;

      if (currentCount === 1) {
        start = i.time;
      } else {
        if (start && +start !== +i.time) {
          results.push(Interval.fromDateTimes(start, i.time));
        }

        start = null;
      }
    }

    return Interval.merge(results);
  }

  /**
   * Return an Interval representing the span of time in this Interval that doesn't overlap with any of the specified Intervals.
   * @param {...Interval} intervals
   * @return {Array}
   */
  difference(...intervals: Interval[]) {
    const array: Interval[] = [this];
    return Interval.xor(array.concat(intervals))
      .map((i) => this.intersection(i))
      .filter((i) => i && !i.isEmpty());
  }

  /**
   * Returns a string representation of this Interval appropriate for debugging.
   * @return {string}
   */
  toString() {
    if (!this.isValid) return INVALID;
    return `[${this.s.toISO()} – ${this.e.toISO()})`;
  }

  /**
   * Returns an ISO 8601-compliant string representation of this Interval.
   * @see https://en.wikipedia.org/wiki/ISO_8601#Time_intervals
   * @param {Object} opts - The same options as {@link DateTime#toISO}
   * @return {string}
   */
  toISO(opts: Parameters<DateTime["toISO"]>[0]) {
    if (!this.isValid) return INVALID;
    return `${this.s.toISO(opts)}/${this.e.toISO(opts)}`;
  }

  /**
   * Returns an ISO 8601-compliant string representation of date of this Interval.
   * The time components are ignored.
   * @see https://en.wikipedia.org/wiki/ISO_8601#Time_intervals
   * @return {string}
   */
  toISODate() {
    if (!this.isValid) return INVALID;
    return `${this.s.toISODate()}/${this.e.toISODate()}`;
  }

  /**
   * Returns an ISO 8601-compliant string representation of time of this Interval.
   * The date components are ignored.
   * @see https://en.wikipedia.org/wiki/ISO_8601#Time_intervals
   * @param {Object} opts - The same options as {@link DateTime#toISO}
   * @return {string}
   */
  toISOTime(opts: DateTimeToISOOptions) {
    if (!this.isValid) return INVALID;
    return `${this.s.toISOTime(opts)}/${this.e.toISOTime(opts)}`;
  }

  /**
   * Returns a string representation of this Interval formatted according to the specified format string.
   * @param {string} dateFormat - the format string. This string formats the start and end time. See {@link DateTime#toFormat} for details.
   * @param {Object} opts - options
   * @param {string} [opts.separator =  ' – '] - a separator to place between the start and end representations
   * @return {string}
   */
  toFormat(dateFormat: string, { separator = " – " } = {}) {
    if (!this.isValid) return INVALID;
    return `${this.s.toFormat(dateFormat)}${separator}${this.e.toFormat(dateFormat)}`;
  }

  /**
   * Return a Duration representing the time spanned by this interval.
   * @param {string|string[]} [unit=['milliseconds']] - the unit or units (such as 'hours' or 'days') to include in the duration.
   * @param {Object} opts - options that affect the creation of the Duration
   * @param {string} [opts.conversionAccuracy='casual'] - the conversion system to use
   * @example Interval.fromDateTimes(dt1, dt2).toDuration().toObject() //=> { milliseconds: 88489257 }
   * @example Interval.fromDateTimes(dt1, dt2).toDuration('days').toObject() //=> { days: 1.0241812152777778 }
   * @example Interval.fromDateTimes(dt1, dt2).toDuration(['hours', 'minutes']).toObject() //=> { hours: 24, minutes: 34.82095 }
   * @example Interval.fromDateTimes(dt1, dt2).toDuration(['hours', 'minutes', 'seconds']).toObject() //=> { hours: 24, minutes: 34, seconds: 49.257 }
   * @example Interval.fromDateTimes(dt1, dt2).toDuration('seconds').toObject() //=> { seconds: 88489.257 }
   * @return {Duration}
   */
  toDuration(unit: string | string[], opts?: { conversionAccuracy: "casual" }) {
    if (!this.isValid) {
      return Duration.invalid(this.invalidReason);
    }

    if (this.s === undefined) {
      return Duration.invalid("interval start should be DateTime, but got undefined");
    } else if (this.e === undefined) {
      return Duration.invalid("interval end should be DateTime, but got undefined");
    }
    return this.e?.diff(this.s, unit, opts);
  }

  /**
   * Run mapFn on the interval start and end, returning a new Interval from the resulting DateTimes
   * @param {function} mapFn
   * @return {Interval}
   * @example Interval.fromDateTimes(dt1, dt2).mapEndpoints(endpoint => endpoint.toUTC())
   * @example Interval.fromDateTimes(dt1, dt2).mapEndpoints(endpoint => endpoint.plus({ hours: 2 }))
   */
  mapEndpoints(mapFn: (endpoint: DateTime) => DateTime) {
    if (this.s === undefined) {
      return Interval.invalid("missing or invalid start");
    } else if (this.e === undefined) {
      return Interval.invalid("missing or invalid end");
    }
    return Interval.fromDateTimes(mapFn(this.s), mapFn(this.e));
  }
}
