import Duration from "../duration";
import type DateTime from "../datetime";
import type { DurationOptions, PluralUnits } from "../types";

function dayDiff(earlier: DateTime, later: DateTime) {
  const utcDayStart = (dt: DateTime) =>
    dt.toUTC(0, { keepLocalTime: true }).startOf("day").valueOf();
  const ms = utcDayStart(later) - utcDayStart(earlier);
  return Math.floor(Duration.fromMillis(ms).as("days"));
}

function highOrderDiffs(cursor: DateTime, later: DateTime, units: PluralUnits[]) {
  const differs = [
    ["years", (a: DateTime, b: DateTime) => b.year - a.year],
    ["quarters", (a: DateTime, b: DateTime) => b.quarter - a.quarter],
    ["months", (a: DateTime, b: DateTime) => b.month - a.month + (b.year - a.year) * 12],
    [
      "weeks",
      (a: DateTime, b: DateTime) => {
        const days = dayDiff(a, b);
        return (days - (days % 7)) / 7;
      },
    ],
    ["days", dayDiff],
  ] as const;

  const results: { [index: string]: number } = {};
  let lowestOrder: string | undefined;
  let highWater: DateTime | undefined;

  for (const [unit, differ] of differs) {
    if (units.indexOf(unit) >= 0) {
      /**
       * Note: lowestOrder may be undefined, if units are empty array.
       * In this case units.indexOf >= 0 will never be true.
       */
      lowestOrder = unit;

      let delta = differ(cursor, later);
      /**
       * Note: highWater may be undefined, if units are empty array.
       * In this case units.indexOf >= 0 will never be true.
       */
      highWater = cursor.plus({ [unit]: delta });

      if (highWater > later) {
        cursor = cursor.plus({ [unit]: delta - 1 });
        delta -= 1;
      } else {
        cursor = highWater;
      }

      results[unit] = delta;
    }
  }

  return { cursor, results, highWater, lowestOrder };
}

export default function (
  earlier: DateTime,
  later: DateTime,
  units: PluralUnits[],
  opts: DurationOptions
) {
  // eslint-disable-next-line prefer-const
  let { cursor, results, highWater, lowestOrder } = highOrderDiffs(earlier, later, units);

  const remainingMillis = later.valueOf() - cursor.valueOf();
  const lowerOrderUnits = units.filter(
    (u) => ["hours", "minutes", "seconds", "milliseconds"].indexOf(u) >= 0
  );

  if (lowerOrderUnits.length === 0) {
    if (highWater === undefined || highWater < later) {
      highWater = lowestOrder !== undefined ? cursor.plus({ [lowestOrder]: 1 }) : cursor;
    }

    if (highWater !== cursor) {
      if (lowestOrder !== undefined) {
        results[lowestOrder] =
          (results[lowestOrder] || 0) + remainingMillis / (highWater.valueOf() - cursor.valueOf());
      }
    }
  }

  const duration = Duration.fromObject(results, opts);

  if (lowerOrderUnits.length > 0) {
    return Duration.fromMillis(remainingMillis, opts)
      .shiftTo(...lowerOrderUnits)
      .plus(duration);
  } else {
    return duration;
  }
}
