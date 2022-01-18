import {
  integerBetween,
  isLeapYear,
  timeObject,
  daysInYear,
  daysInMonth,
  weeksInWeekYear,
  isInteger,
} from "./util";
import Invalid from "./invalid";

import type { DateTimeJSObject } from "../types/datetime";

const nonLeapLadder = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
const leapLadder = [0, 31, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335];

function unitOutOfRange(unit: string, value: number | undefined) {
  return new Invalid(
    "unit out of range",
    `you specified ${value} (of type ${typeof value}) as a ${unit}, which is invalid`
  );
}

function dayOfWeek(year: number, month: number, day: number) {
  const js = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return js === 0 ? 7 : js;
}

function computeOrdinal(year: number, month: number, day: number) {
  return day + (isLeapYear(year) ? leapLadder : nonLeapLadder)[month - 1];
}

function uncomputeOrdinal(year: number, ordinal: number) {
  const table = isLeapYear(year) ? leapLadder : nonLeapLadder;
  const month0 = table.findIndex((i) => i < ordinal);
  const day = ordinal - table[month0];
  return { month: month0 + 1, day };
}

/**
 * @private
 */

export function gregorianToWeek(gregObj: { year: number; month: number; day: number }) {
  const { year, month, day } = gregObj;
  const ordinal = computeOrdinal(year, month, day);
  const weekday = dayOfWeek(year, month, day);

  let weekNumber = Math.floor((ordinal - weekday + 10) / 7);
  let weekYear: number;

  if (weekNumber < 1) {
    weekYear = year - 1;
    weekNumber = weeksInWeekYear(weekYear);
  } else if (weekNumber > weeksInWeekYear(year)) {
    weekYear = year + 1;
    weekNumber = 1;
  } else {
    weekYear = year;
  }

  return { weekYear, weekNumber, weekday, ...timeObject(gregObj) };
}

export function weekToGregorian(weekData: {
  weekYear: number;
  weekNumber: number;
  weekday: number;
}) {
  const { weekYear, weekNumber, weekday } = weekData;
  const weekdayOfJan4 = dayOfWeek(weekYear, 1, 4);
  const yearInDays = daysInYear(weekYear);

  let ordinal = weekNumber * 7 + weekday - weekdayOfJan4 - 3;
  let year: number;

  if (ordinal < 1) {
    year = weekYear - 1;
    ordinal += daysInYear(year);
  } else if (ordinal > yearInDays) {
    year = weekYear + 1;
    ordinal -= daysInYear(weekYear);
  } else {
    year = weekYear;
  }

  const { month, day } = uncomputeOrdinal(year, ordinal);
  return { year, month, day, ...timeObject(weekData) };
}

export function gregorianToOrdinal(gregData: { year: number; month: number; day: number }) {
  const { year, month, day } = gregData;
  const ordinal = computeOrdinal(year, month, day);
  return { year, ordinal, ...timeObject(gregData) };
}

export function ordinalToGregorian(ordinalData: { year: number; ordinal: number }) {
  const { year, ordinal } = ordinalData;
  const { month, day } = uncomputeOrdinal(year, ordinal);
  return { year, month, day, ...timeObject(ordinalData) };
}

export function hasInvalidWeekData(
  obj: Partial<Pick<DateTimeJSObject, "weekYear" | "weekNumber" | "weekday">>
) {
  if (isInteger(obj.weekYear)) {
    if (integerBetween(obj.weekNumber, 1, weeksInWeekYear(obj.weekYear))) {
      if (integerBetween(obj.weekday, 1, 7)) {
        return false;
      } else {
        return unitOutOfRange("weekday", obj.weekday);
      }
    } else {
      return unitOutOfRange("weekNumber", obj.weekNumber);
    }
  } else {
    return unitOutOfRange("weekYear", obj.weekYear);
  }
}

export function hasInvalidOrdinalData(obj: Partial<Pick<DateTimeJSObject, "year" | "ordinal">>) {
  if (isInteger(obj.year)) {
    if (integerBetween(obj.ordinal, 1, daysInYear(obj.year))) {
      return false;
    } else {
      return unitOutOfRange("ordinal", obj.ordinal);
    }
  } else {
    return unitOutOfRange("year", obj.year);
  }
}

export function hasInvalidGregorianData(
  obj: Partial<Pick<DateTimeJSObject, "year" | "month" | "day">>
) {
  if (isInteger(obj.year)) {
    if (integerBetween(obj.month, 1, 12)) {
      if (integerBetween(obj.day, 1, daysInMonth(obj.year, obj.month))) {
        return false;
      } else {
        return unitOutOfRange("day", obj.day);
      }
    } else {
      return unitOutOfRange("month", obj.month);
    }
  } else {
    return unitOutOfRange("year", obj.year);
  }
}

export function hasInvalidTimeData(
  obj: Partial<Pick<DateTimeJSObject, "hour" | "minute" | "second" | "millisecond">>
) {
  if (
    integerBetween(obj.hour, 0, 23) ||
    (obj.hour === 24 && obj.minute === 0 && obj.second === 0 && obj.millisecond === 0)
  ) {
    if (integerBetween(obj.minute, 0, 59)) {
      if (integerBetween(obj.second, 0, 59)) {
        if (integerBetween(obj.millisecond, 0, 999)) {
          return false;
        } else {
          return unitOutOfRange("millisecond", obj.millisecond);
        }
      } else {
        return unitOutOfRange("second", obj.second);
      }
    } else {
      return unitOutOfRange("minute", obj.minute);
    }
  } else {
    return unitOutOfRange("hour", obj.hour);
  }
}
