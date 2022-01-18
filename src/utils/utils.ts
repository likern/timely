import { InvalidUnitError } from "../errors";

export const normalizeUnitOrThrow = <T>(unit: string, map: Map<string, T>) => {
  const lowerCase = unit.toLowerCase();
  const value = map.get(lowerCase);

  if (value === undefined) {
    throw new InvalidUnitError(unit);
  }

  return value;
};
