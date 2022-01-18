import { formatOffset, signedOffset } from "../impl/util";
import Zone from "../zone";
import type { FormatStyle } from "../types";

let singleton: FixedOffsetZone | null = null;

/**
 * A zone with a fixed offset (meaning no DST)
 * @implements {Zone}
 */
export default class FixedOffsetZone extends Zone {
  fixed: number;

  /**
   * Get a singleton instance of UTC
   * @return {FixedOffsetZone}
   */
  static get utcInstance() {
    if (singleton === null) {
      singleton = new FixedOffsetZone(0);
    }
    return singleton;
  }

  /**
   * Get an instance with a specified offset
   * @param {number} offset - The offset in minutes
   * @return {FixedOffsetZone}
   */
  static instance(offset: number) {
    return offset === 0 ? FixedOffsetZone.utcInstance : new FixedOffsetZone(offset);
  }

  /**
   * Get an instance of FixedOffsetZone from a UTC offset string, like "UTC+6"
   * @param {string} s - The offset string to parse
   * @example FixedOffsetZone.parseSpecifier("UTC+6")
   * @example FixedOffsetZone.parseSpecifier("UTC+06")
   * @example FixedOffsetZone.parseSpecifier("UTC-6:00")
   * @return {FixedOffsetZone}
   */
  static parseSpecifier(s: string) {
    if (s) {
      const r = s.match(/^utc(?:([+-]\d{1,2})(?::(\d{2}))?)?$/i);
      if (r) {
        return new FixedOffsetZone(signedOffset(r[1], r[2]));
      }
    }
    return null;
  }

  constructor(offset: number) {
    super();
    /** @private **/
    this.fixed = offset;
  }

  /** @override **/
  get type() {
    return "fixed";
  }

  /** @override **/
  get name() {
    return this.fixed === 0 ? "UTC" : `UTC${formatOffset(this.fixed, "narrow")}`;
  }

  /** @override **/
  offsetName() {
    return this.name;
  }

  /**
   * FIXME: ts parameter is not used here
   */
  /** @override **/
  formatOffset(_ts: number, format: FormatStyle) {
    return formatOffset(this.fixed, format);
  }

  /** @override **/
  get isUniversal() {
    return true;
  }

  /** @override **/
  offset() {
    return this.fixed;
  }

  /** @override **/
  equals(otherZone: Zone): boolean {
    return (
      otherZone.type === "fixed" &&
      Object.prototype.hasOwnProperty.call(otherZone, "fixed") &&
      (otherZone as FixedOffsetZone).fixed === this.fixed
    );
  }

  /** @override **/
  get isValid() {
    return true;
  }
}
