import {
  type Category,
  FIRST_YEAR,
  INDICATORS,
  type Indicator,
  LAST_YEAR,
} from "./data/world";

export const ROUNDS = 6;
export const START_PANELS = 3;
export const MAX_EXTRA_PANELS = 3;
export const EXTRA_PANEL_COST = 80;
export const BASE_SCORE = 1000;

export const CATEGORIES: Category[] = ["people", "planet", "technology"];

export const CATEGORY_LABELS: Record<Category, string> = {
  people: "people",
  planet: "planet",
  technology: "technology",
};

export interface Round {
  /** The hidden year. */
  year: number;
  /** Indicator ids currently on the table, in display order. */
  panels: string[];
  /** The one guess, final once set; null while the round is open. */
  guess: number | null;
}

export interface DistanceScore {
  /** Years between the guess and the hidden year. */
  diff: number;
  /** Points for the distance alone, before the extra panels are paid for. */
  points: number;
  /** One short phrase for the reveal. */
  verdict: string;
}

/**
 * Points fall with the distance. A guess that is off by a few years still
 * pays nearly everything, a wrong decade pays a fraction, an era off pays
 * nothing: the round is a reading of the world, not a search for one number.
 */
const TIERS: [maxDiff: number, points: number, verdict: string][] = [
  [0, BASE_SCORE, "dead on"],
  [2, 900, "a whisker away"],
  [5, 750, "close"],
  [10, 450, "the right decade, the wrong year"],
  [20, 200, "a decade off"],
  [40, 80, "far off"],
  [Number.POSITIVE_INFINITY, 0, "another era"],
];

/** Value of an indicator in a given year, or undefined if unmeasured. */
export function valueAt(
  indicator: Indicator,
  year: number,
): number | undefined {
  for (const [y, value] of indicator.values) {
    if (y === year) return value;
  }
  return undefined;
}

export function indicatorsAt(year: number): Indicator[] {
  return INDICATORS.filter(
    (indicator) => valueAt(indicator, year) !== undefined,
  );
}

export function indicatorById(id: string): Indicator {
  const found = INDICATORS.find((indicator) => indicator.id === id);
  if (found === undefined) throw new Error(`unknown indicator: ${id}`);
  return found;
}

/** mulberry32: small deterministic PRNG so tests can pin a round. */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, items: T[]): T {
  const item = items[Math.floor(rng() * items.length)];
  if (item === undefined) throw new Error("cannot pick from an empty list");
  return item;
}

function shuffled<T>(rng: () => number, items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const a = copy[i];
    const b = copy[j];
    if (a !== undefined && b !== undefined) {
      copy[i] = b;
      copy[j] = a;
    }
  }
  return copy;
}

/**
 * A round needs one panel per category, because a single-category table can
 * leave a player with no way in: a year is only deducible if at least one
 * panel is self-explanatory (internet share, tallest building) or at least
 * broadly known (world population).
 */
export function createRound(
  rng: () => number,
  usedYears: number[] = [],
): Round {
  for (let attempt = 0; attempt < 1000; attempt++) {
    const year = FIRST_YEAR + Math.floor(rng() * (LAST_YEAR - FIRST_YEAR + 1));
    if (usedYears.includes(year)) continue;
    const available = indicatorsAt(year);
    const perCategory = CATEGORIES.map((category) =>
      available.filter((indicator) => indicator.category === category),
    );
    if (perCategory.some((list) => list.length === 0)) continue;
    const panels = perCategory.map((list) => pick(rng, list).id);
    return {
      year,
      panels: shuffled(rng, panels),
      guess: null,
    };
  }
  throw new Error("no year with a full panel set");
}

export function scoreFor(guess: number, year: number): DistanceScore {
  const diff = Math.abs(Math.round(guess) - year);
  const tier = TIERS.find(([maxDiff]) => diff <= maxDiff);
  if (tier === undefined) throw new Error(`no tier for a gap of ${diff}`);
  const [, points, verdict] = tier;
  return { diff, points, verdict };
}

export function isFinished(round: Round): boolean {
  return round.guess !== null;
}

/** A guess is final: the round scores it and takes no second attempt. */
export function submitGuess(round: Round, guess: number): Round {
  if (isFinished(round)) return round;
  const clamped = Math.min(LAST_YEAR, Math.max(FIRST_YEAR, Math.round(guess)));
  return { ...round, guess: clamped };
}

export function extraPanelsUsed(round: Round): number {
  return round.panels.length - START_PANELS;
}

/** Categories that still have an unshown, measured panel this year. */
export function extraOptions(round: Round): Category[] {
  if (isFinished(round) || extraPanelsUsed(round) >= MAX_EXTRA_PANELS) {
    return [];
  }
  const available = indicatorsAt(round.year).filter(
    (indicator) => !round.panels.includes(indicator.id),
  );
  return CATEGORIES.filter((category) =>
    available.some((indicator) => indicator.category === category),
  );
}

export function addPanel(
  round: Round,
  category: Category,
  rng: () => number = Math.random,
): Round {
  if (!extraOptions(round).includes(category)) return round;
  const candidates = indicatorsAt(round.year).filter(
    (indicator) =>
      indicator.category === category && !round.panels.includes(indicator.id),
  );
  const added = candidates[Math.floor(rng() * candidates.length)];
  if (added === undefined) return round;
  return { ...round, panels: [...round.panels, added.id] };
}

export function roundScore(round: Round): number {
  if (round.guess === null) return 0;
  const { points } = scoreFor(round.guess, round.year);
  // Three extra panels still leave 760 of an exact hit.
  return Math.max(0, points - EXTRA_PANEL_COST * extraPanelsUsed(round));
}

export function totalScore(rounds: Round[]): number {
  return rounds.reduce((sum, round) => sum + roundScore(round), 0);
}

/** One line under the round total, keyed on the share of the maximum. */
export function totalVerdict(score: number, max: number): string {
  const share = max > 0 ? score / max : 0;
  if (share >= 0.95)
    return "Every year within a whisker. The timeline is yours.";
  if (share >= 0.8) return "Sharp reading: the decades and most of the years.";
  if (share >= 0.6) return "Solid. The eras are right, a few years slipped.";
  if (share >= 0.35) return "You know the era; the exact year stayed a guess.";
  if (share >= 0.1) return "Rough. Read the panels more closely next time.";
  return "The world moved on without you this round.";
}
