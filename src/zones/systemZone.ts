import { formatOffset, parseZoneInfo } from "../impl/util.js";
import Zone from "../zone.js";

import type { FormatOptions, FormatStyle } from "../types.js";

let singleton: SystemZone | null = null;

/**
 * Represents the local zone for this JavaScript environment.
 * @implements {Zone}
 */
export default class SystemZone extends Zone {
  /**
   * Get a singleton instance of the local zone
   * @return {SystemZone}
   */
  static get instance() {
    if (singleton === null) {
      singleton = new SystemZone();
    }
    return singleton;
  }

  /** @override **/
  override get type() {
    return "system";
  }

  /** @override **/
  override get name() {
    return new Intl.DateTimeFormat().resolvedOptions().timeZone;
  }

  /** @override **/
  override get isUniversal() {
    return false;
  }

  /** @override **/
  override offsetName(ts: number, { format, locale }: FormatOptions) {
    return parseZoneInfo(ts, format, locale);
  }

  /** @override **/
  override formatOffset(ts: number, format: FormatStyle) {
    return formatOffset(this.offset(ts), format);
  }

  /** @override **/
  override offset(ts: number) {
    return -new Date(ts).getTimezoneOffset();
  }

  /** @override **/
  override equals(otherZone: Zone) {
    return otherZone.type === "system";
  }

  /** @override **/
  override get isValid() {
    return true;
  }
}
