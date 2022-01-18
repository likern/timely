/**
 * @private
 */

import Zone from "../zone";
import IANAZone from "../zones/IANAZone";
import FixedOffsetZone from "../zones/fixedOffsetZone";
import InvalidZone from "../zones/invalidZone";

import { isUndefined, isString, isNumber } from "./util";

export function normalizeZone(
  input: string | number | Zone | null | undefined,
  defaultZone: string
): string | Zone {
  if (isUndefined(input) || input === null) {
    return defaultZone;
  } else if (input instanceof Zone) {
    return input;
  } else if (isString(input)) {
    const lowered = input.toLowerCase();
    if (lowered === "local" || lowered === "system") return defaultZone;
    else if (lowered === "utc" || lowered === "gmt") return FixedOffsetZone.utcInstance;
    else return FixedOffsetZone.parseSpecifier(lowered) || IANAZone.create(input);
  } else if (isNumber(input)) {
    return FixedOffsetZone.instance(input);
  } else {
    return new InvalidZone(input);
  }
}
