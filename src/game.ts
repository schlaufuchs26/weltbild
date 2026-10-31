import {
  type Category,
  FIRST_YEAR,
  INDICATORS,
  type Indicator,
  LAST_YEAR,
} from "./data/world";

export const ROUNDS = 6;
export const START_PANELS = 3;
export const MAX_GUESSES = 4;
export const MAX_EXTRA_PANELS = 3;
export const EXTRA_PANEL_COST = 80;
export const WRONG_GUESS_COST = 150;
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
  guesses: number[];
  solved: boolean;
  finished: boolean;
}

export interface Judgement {
  direction: "earlier" | "later" | "exact";
  diff: number;
  band: string;
}

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
      guesses: [],
      solved: false,
      finished: false,
    };
  }
  throw new Error("no year with a full panel set");
}

export function band(diff: number): string {
  if (diff === 0) return "exact";
  if (diff <= 3) return "within 3 years";
  if (diff <= 10) return "within 10 years";
  if (diff <= 25) return "within 25 years";
  return "more than 25 years off";
}

export function judge(year: number, guess: number): Judgement {
  const diff = Math.abs(guess - year);
  const direction = diff === 0 ? "exact" : guess < year ? "later" : "earlier";
  return { direction, diff, band: band(diff) };
}

export function submitGuess(round: Round, guess: number): Round {
  if (round.finished) return round;
  const clamped = Math.min(LAST_YEAR, Math.max(FIRST_YEAR, Math.round(guess)));
  const guesses = [...round.guesses, clamped];
  const solved = clamped === round.year;
  return {
    ...round,
    guesses,
    solved,
    finished: solved || guesses.length >= MAX_GUESSES,
  };
}

export function extraPanelsUsed(round: Round): number {
  return round.panels.length - START_PANELS;
}

/** Categories that still have an unshown, measured panel this year. */
export function extraOptions(round: Round): Category[] {
  if (round.finished || extraPanelsUsed(round) >= MAX_EXTRA_PANELS) return [];
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
  if (!round.solved) return 0;
  const spent =
    EXTRA_PANEL_COST * extraPanelsUsed(round) +
    WRONG_GUESS_COST * (round.guesses.length - 1);
  // 3 extras and 3 wrong guesses still leave 310 of the base score.
  return Math.max(0, BASE_SCORE - spent);
}

export function totalScore(rounds: Round[]): number {
  return rounds.reduce((sum, round) => sum + roundScore(round), 0);
}
