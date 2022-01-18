import { parseMillis, isUndefined, untruncateYear, signedOffset, hasOwnProperty } from "./util";
import Formatter from "./formatter";
import FixedOffsetZone from "../zones/fixedOffsetZone";
import IANAZone from "../zones/IANAZone";
import DateTime from "../datetime";
import { digitRegex, parseDigits } from "./digits";
import { ConflictingSpecificationError } from "../errors";

import type Locale from "./locale";
import type { InternalFormatValues } from "../types/formatter";
import type { AddIndexAccessToEveryObjectInUnion } from "../types/advanced";
import type Zone from "../zone";

type Token = { literal: boolean; val: string };

type LiteralUnit = {
  regex: RegExp;
  deser: ([s]: string[]) => string;
  literal: boolean;
};
type IntUnit = {
  regex: RegExp;
  deser: ([s]: string[]) => number;
};
type OneOfUnit = {
  regex: RegExp;
  deser: ([s]: string[]) => number;
} | null;
type OffsetUnit = {
  regex: RegExp;
  deser: ([, h, m]: string[]) => number;
  groups: number;
};
type SimpleUnit = {
  regex: RegExp;
  deser: ([s]: string[]) => string;
};
type ValidUnit = LiteralUnit | IntUnit | OneOfUnit | OffsetUnit | SimpleUnit;
type InvalidUnit = {
  invalidReason: string;
  token: Token;
};

const MISSING_FTP = "missing Intl.DateTimeFormat.formatToParts support";

function intUnit(regex: RegExp, post = (i: number) => i): IntUnit {
  return { regex, deser: ([s]) => post(parseDigits(s)) };
}

const NBSP = String.fromCharCode(160);
const spaceOrNBSP = `( |${NBSP})`;
const spaceOrNBSPRegExp = new RegExp(spaceOrNBSP, "g");

function fixListRegex(s: string) {
  // make dots optional and also make them literal
  // make space and non breakable space characters interchangeable
  return s.replace(/\./g, "\\.?").replace(spaceOrNBSPRegExp, spaceOrNBSP);
}

function stripInsensitivities(s: string) {
  return s
    .replace(/\./g, "") // ignore dots that were made optional
    .replace(spaceOrNBSPRegExp, " ") // interchange space and nbsp
    .toLowerCase();
}

function oneOf(strings: string[] | null, startIndex: number): OneOfUnit {
  if (strings === null) {
    return null;
  } else {
    return {
      regex: RegExp(strings.map(fixListRegex).join("|")),
      deser: ([s]: string[]) =>
        strings.findIndex((i) => stripInsensitivities(s) === stripInsensitivities(i)) + startIndex,
    };
  }
}

function offset(regex: RegExp, groups: number): OffsetUnit {
  return { regex, deser: ([, h, m]: string[]) => signedOffset(h, m), groups };
}

function simple(regex: RegExp): SimpleUnit {
  return { regex, deser: ([s]: string[]) => s };
}

function escapeToken(value: string) {
  /**
   * FIXME: Check is there really some useless escape
   */
  // eslint-disable-next-line no-useless-escape
  return value.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g, "\\$&");
}

export const isUnitInvalid = (unit: ReturnType<typeof unitForToken>): unit is InvalidUnit => {
  return Object.prototype.hasOwnProperty.call(unit, "invalidReason");
};

function unitForToken(token: Token, loc: Locale) {
  const one = digitRegex(loc);
  const two = digitRegex(loc, "{2}");
  const three = digitRegex(loc, "{3}");
  const four = digitRegex(loc, "{4}");
  const six = digitRegex(loc, "{6}");
  const oneOrTwo = digitRegex(loc, "{1,2}");
  const oneToThree = digitRegex(loc, "{1,3}");
  const oneToSix = digitRegex(loc, "{1,6}");
  const oneToNine = digitRegex(loc, "{1,9}");
  const twoToFour = digitRegex(loc, "{2,4}");
  const fourToSix = digitRegex(loc, "{4,6}");
  const literal: (t: Token) => LiteralUnit = (t: Token) => ({
    regex: RegExp(escapeToken(t.val)),
    deser: ([s]: string[]) => s,
    literal: true,
  });
  const unitate = (t: Token): LiteralUnit | OneOfUnit | IntUnit | SimpleUnit | OffsetUnit => {
    if (token.literal) {
      return literal(t);
    }
    switch (t.val) {
      // era
      case "G":
        return oneOf(loc.eras("short", false), 0);
      case "GG":
        return oneOf(loc.eras("long", false), 0);
      // years
      case "y":
        return intUnit(oneToSix);
      case "yy":
        return intUnit(twoToFour, untruncateYear);
      case "yyyy":
        return intUnit(four);
      case "yyyyy":
        return intUnit(fourToSix);
      case "yyyyyy":
        return intUnit(six);
      // months
      case "M":
        return intUnit(oneOrTwo);
      case "MM":
        return intUnit(two);
      case "MMM":
        return oneOf(loc.months("short", true, false), 1);
      case "MMMM":
        return oneOf(loc.months("long", true, false), 1);
      case "L":
        return intUnit(oneOrTwo);
      case "LL":
        return intUnit(two);
      case "LLL":
        return oneOf(loc.months("short", false, false), 1);
      case "LLLL":
        return oneOf(loc.months("long", false, false), 1);
      // dates
      case "d":
        return intUnit(oneOrTwo);
      case "dd":
        return intUnit(two);
      // ordinals
      case "o":
        return intUnit(oneToThree);
      case "ooo":
        return intUnit(three);
      // time
      case "HH":
        return intUnit(two);
      case "H":
        return intUnit(oneOrTwo);
      case "hh":
        return intUnit(two);
      case "h":
        return intUnit(oneOrTwo);
      case "mm":
        return intUnit(two);
      case "m":
        return intUnit(oneOrTwo);
      case "q":
        return intUnit(oneOrTwo);
      case "qq":
        return intUnit(two);
      case "s":
        return intUnit(oneOrTwo);
      case "ss":
        return intUnit(two);
      case "S":
        return intUnit(oneToThree);
      case "SSS":
        return intUnit(three);
      case "u":
        return simple(oneToNine);
      case "uu":
        return simple(oneOrTwo);
      case "uuu":
        return intUnit(one);
      // meridiem
      case "a":
        return oneOf(loc.meridiems(), 0);
      // weekYear (k)
      case "kkkk":
        return intUnit(four);
      case "kk":
        return intUnit(twoToFour, untruncateYear);
      // weekNumber (W)
      case "W":
        return intUnit(oneOrTwo);
      case "WW":
        return intUnit(two);
      // weekdays
      case "E":
      case "c":
        return intUnit(one);
      case "EEE":
        return oneOf(loc.weekdays("short", false, false), 1);
      case "EEEE":
        return oneOf(loc.weekdays("long", false, false), 1);
      case "ccc":
        return oneOf(loc.weekdays("short", true, false), 1);
      case "cccc":
        return oneOf(loc.weekdays("long", true, false), 1);
      // offset/zone
      case "Z":
      case "ZZ":
        return offset(new RegExp(`([+-]${oneOrTwo.source})(?::(${two.source}))?`), 2);
      case "ZZZ":
        return offset(new RegExp(`([+-]${oneOrTwo.source})(${two.source})?`), 2);
      // we don't support ZZZZ (PST) or ZZZZZ (Pacific Standard Time) in parsing
      // because we don't have any way to figure out what they are
      case "z":
        return simple(/[a-z_+-/]{1,256}?/i);
      default:
        return literal(t);
    }
  };

  const unit: ReturnType<typeof unitate> | InvalidUnit =
    unitate(token) ||
    <InvalidUnit>{
      invalidReason: MISSING_FTP,
    };

  const finalUnit: (ReturnType<typeof unitate> | InvalidUnit) & { token: Token } = {
    ...unit,
    token,
  };
  return finalUnit;
}

const partTypeStyleToTokenVal = {
  year: {
    "2-digit": "yy",
    numeric: "yyyyy",
  },
  month: {
    numeric: "M",
    "2-digit": "MM",
    short: "MMM",
    long: "MMMM",
  },
  day: {
    numeric: "d",
    "2-digit": "dd",
  },
  weekday: {
    short: "EEE",
    long: "EEEE",
  },
  dayperiod: "a",
  dayPeriod: "a",
  hour: {
    numeric: "h",
    "2-digit": "hh",
  },
  minute: {
    numeric: "m",
    "2-digit": "mm",
  },
  second: {
    numeric: "s",
    "2-digit": "ss",
  },
} as const;

function tokenForPart(
  part: Intl.DateTimeFormatPart,
  formatOpts: AddIndexAccessToEveryObjectInUnion<InternalFormatValues, { [index: string]: unknown }>
) {
  const { type, value } = part;

  if (type === "literal") {
    return {
      literal: true,
      val: value,
    };
  }

  const style = formatOpts[type];

  /**
   * FIXME: Check can we do this?
   */
  if (style === undefined) {
    return undefined;
  }

  const partTypeStyleToTokenlValWithIndexAccess: AddIndexAccessToEveryObjectInUnion<
    typeof partTypeStyleToTokenVal,
    { [index: string]: unknown }
  > = partTypeStyleToTokenVal;
  const tokenVal = partTypeStyleToTokenlValWithIndexAccess[type];

  let resultVal:
    | AddIndexAccessToEveryObjectInUnion<typeof tokenVal, { [index: string]: unknown }>[string]
    | "a";

  if (typeof tokenVal === "object") {
    const tokenValWithIndexAccess: AddIndexAccessToEveryObjectInUnion<
      typeof tokenVal,
      { [index: string]: unknown }
    > = tokenVal;
    resultVal = tokenValWithIndexAccess[style];
  } else {
    resultVal = tokenVal;
  }

  if (resultVal) {
    return {
      literal: false,
      val: resultVal,
    };
  }

  return undefined;
}

function buildRegex(units: ValidUnit[]): [string, ValidUnit[]] {
  const re = units
    .map((u) => (u !== null ? u.regex : null))
    .reduce((f, r) => (r !== null ? `${f}(${r.source})` : `${f}`), "");
  return [`^${re}$`, units];
}

function match(
  input: string,
  regex: RegExp,
  handlers: ValidUnit[]
): [RegExpMatchArray | null, { [index: string]: string | number }] {
  const matches = input.match(regex);

  if (matches) {
    const all: { [index: string]: string | number } = {};
    let matchIndex = 1;
    for (const i in handlers) {
      if (hasOwnProperty(handlers, i)) {
        const h = handlers[i];
        // @ts-expect-error refine types
        const groups = h.groups ? h.groups + 1 : 1;
        // @ts-expect-error refine types
        if (!h.literal && h.token) {
          // @ts-expect-error refine types
          all[h.token.val[0]] = h.deser(matches.slice(matchIndex, matchIndex + groups));
        }
        matchIndex += groups;
      }
    }
    return [matches, all];
  } else {
    return [matches, {}];
  }
}

function dateTimeFromMatches(matches: { [index: string]: string | number }) {
  const toField = (token: string) => {
    switch (token) {
      case "S":
        return "millisecond";
      case "s":
        return "second";
      case "m":
        return "minute";
      case "h":
      case "H":
        return "hour";
      case "d":
        return "day";
      case "o":
        return "ordinal";
      case "L":
      case "M":
        return "month";
      case "y":
        return "year";
      case "E":
      case "c":
        return "weekday";
      case "W":
        return "weekNumber";
      case "k":
        return "weekYear";
      case "q":
        return "quarter";
      default:
        return null;
    }
  };

  let zone: Zone | null = null;
  let specificOffset;
  if (!isUndefined(matches.z)) {
    zone = IANAZone.create(String(matches.z));
  }

  if (!isUndefined(matches.Z)) {
    if (!zone) {
      zone = new FixedOffsetZone(Number(matches.Z));
    }
    specificOffset = matches.Z;
  }

  if (!isUndefined(matches.q)) {
    matches.M = (Number(matches.q) - 1) * 3 + 1;
  }

  if (!isUndefined(matches.h)) {
    if (Number(matches.h) < 12 && Number(matches.a) === 1) {
      matches.h = Number(matches.h) + 12;
    } else if (matches.h === 12 && matches.a === 0) {
      matches.h = 0;
    }
  }

  if (Number(matches.G) === 0 && Number(matches.y)) {
    matches.y = -Number(matches.y);
  }

  if (!isUndefined(matches.u)) {
    // @ts-expect-error FIXME: Look at this line
    matches.S = parseMillis(String(matches.u));
  }

  const initialObject: { [index: string]: string | number } = {};
  const vals = Object.keys(matches).reduce((r, k) => {
    const f = toField(k);
    if (f) {
      r[f] = matches[k];
    }

    return r;
  }, initialObject);

  return [vals, zone, specificOffset];
}

let dummyDateTimeCache: DateTime | null = null;

function getDummyDateTime() {
  if (!dummyDateTimeCache) {
    dummyDateTimeCache = DateTime.fromMillis(1555555555555);
  }

  return dummyDateTimeCache;
}

const allTokensAreObjects = (tokens: (Token | undefined)[]): tokens is Token[] => {
  return !tokens.includes(undefined);
};

function maybeExpandMacroToken(token: Token, locale: Locale) {
  if (token.literal) {
    return token;
  }

  const formatOpts = Formatter.macroTokenToFormatOpts(token.val);

  if (!formatOpts) {
    return token;
  }

  const formatter = Formatter.create(locale, formatOpts);
  const parts = formatter.formatDateTimeParts(getDummyDateTime());

  const tokens = parts.map((p) => tokenForPart(p, formatOpts));

  if (!allTokensAreObjects(tokens)) {
    return token;
  } else {
    return tokens;
  }
}

function expandMacroTokens(tokens: Token[], locale: Locale) {
  const arrays = tokens.map((t) => maybeExpandMacroToken(t, locale));
  return Array.prototype.concat(...arrays) as typeof arrays[number];
}

/**
 * @private
 */

export function explainFromTokens(locale: Locale, input: string, format: string) {
  /**
   * Note: expandMacroTokens can return single Token or array of Tokens.
   */
  const tokens = expandMacroTokens(Formatter.parseFormat(format), locale);

  const units = Array.isArray(tokens)
    ? tokens.map((t) => unitForToken(t, locale))
    : unitForToken(tokens, locale);

  const disqualifyingUnit: InvalidUnit | undefined = Array.isArray(units)
    ? (units.find((t) => isUnitInvalid(t)) as InvalidUnit | undefined)
    : isUnitInvalid(units)
    ? units
    : undefined;

  if (disqualifyingUnit) {
    return { input, tokens, invalidReason: disqualifyingUnit.invalidReason };
  } else {
    const [regexString, handlers] = buildRegex(units as ValidUnit[]);
    const regex = RegExp(regexString, "i");
    const [rawMatches, matches] = match(input, regex, handlers);
    const [result, zone, specificOffset] = matches
      ? dateTimeFromMatches(matches)
      : [null, null, undefined];

    if (hasOwnProperty(matches, "a") && hasOwnProperty(matches, "H")) {
      throw new ConflictingSpecificationError(
        "Can't include meridiem when specifying 24-hour format"
      );
    }
    return { input, tokens, regex, rawMatches, matches, result, zone, specificOffset };
  }
}

export function parseFromTokens(locale: Locale, input: string, format: string) {
  const { result, zone, specificOffset, invalidReason } = explainFromTokens(locale, input, format);
  return [result, zone, specificOffset, invalidReason];
}
