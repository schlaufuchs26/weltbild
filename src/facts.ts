import type { Indicator } from "./data/world";

/** The building that held the height record, keyed by the year it took it. */
const TALLEST_NAMES: [number, string][] = [
  [1950, "Empire State Building"],
  [1971, "World Trade Center"],
  [1974, "Sears Tower"],
  [1998, "Petronas Towers"],
  [2004, "Taipei 101"],
  [2010, "Burj Khalifa"],
];

function tallestName(year: number): string {
  let name = TALLEST_NAMES[0]?.[1] ?? "";
  for (const [from, label] of TALLEST_NAMES) {
    if (year >= from) name = label;
  }
  return name;
}

/** Optional one-line caption under a panel value. */
export function captionFor(
  indicator: Indicator,
  year: number,
): string | undefined {
  return indicator.id === "tallest" ? tallestName(year) : undefined;
}
