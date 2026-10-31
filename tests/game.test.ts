import { describe, expect, test } from "bun:test";
import { FIRST_YEAR, INDICATORS, LAST_YEAR } from "../src/data/world";
import {
  addPanel,
  BASE_SCORE,
  band,
  CATEGORIES,
  createRound,
  EXTRA_PANEL_COST,
  extraOptions,
  extraPanelsUsed,
  indicatorById,
  indicatorsAt,
  judge,
  MAX_EXTRA_PANELS,
  MAX_GUESSES,
  mulberry32,
  ROUNDS,
  roundScore,
  START_PANELS,
  submitGuess,
  totalScore,
  valueAt,
  WRONG_GUESS_COST,
} from "../src/game";

const population = indicatorById("population");

describe("the data table", () => {
  test("every indicator has measured years inside the playable range", () => {
    for (const indicator of INDICATORS) {
      expect(indicator.values.length).toBeGreaterThan(10);
      const years = indicator.values.map(([year]) => year);
      expect(years[0]).toBeGreaterThanOrEqual(FIRST_YEAR);
      expect(years[years.length - 1]).toBeLessThanOrEqual(LAST_YEAR);
      // ascending, no duplicates: valueAt relies on a plain scan
      expect([...years].sort((a, b) => a - b)).toEqual(years);
      expect(new Set(years).size).toBe(years.length);
    }
  });

  test("all three categories exist", () => {
    for (const category of CATEGORIES) {
      expect(
        INDICATORS.some((indicator) => indicator.category === category),
      ).toBe(true);
    }
  });

  test("known values are the published ones", () => {
    expect(valueAt(population, 1950)).toBe(2_493_092_852);
    expect(valueAt(indicatorById("co2"), 1960)).toBeCloseTo(316.91, 1);
    expect(valueAt(indicatorById("internet"), 2000)).toBeUndefined();
  });
});

describe("valueAt and indicatorsAt", () => {
  test("returns undefined for a year without a measurement", () => {
    expect(valueAt(population, 1900)).toBeUndefined();
  });

  test("only lists indicators measured in that year", () => {
    const early = indicatorsAt(1950).map((indicator) => indicator.id);
    const late = indicatorsAt(2010).map((indicator) => indicator.id);
    expect(early).toContain("population");
    expect(early).not.toContain("internet");
    expect(late).toContain("internet");
  });

  test("unknown ids throw", () => {
    expect(() => indicatorById("nope")).toThrow("unknown indicator");
  });
});

describe("createRound", () => {
  test("deals one panel per category, all measured in that year", () => {
    for (let seed = 1; seed <= 40; seed++) {
      const round = createRound(mulberry32(seed));
      expect(round.panels).toHaveLength(START_PANELS);
      expect(new Set(round.panels).size).toBe(START_PANELS);
      const categories = round.panels.map((id) => indicatorById(id).category);
      expect([...categories].sort()).toEqual([...CATEGORIES].sort());
      for (const id of round.panels) {
        expect(valueAt(indicatorById(id), round.year)).toBeDefined();
      }
      expect(round.year).toBeGreaterThanOrEqual(FIRST_YEAR);
      expect(round.year).toBeLessThanOrEqual(LAST_YEAR);
    }
  });

  test("is deterministic for a seed and avoids used years", () => {
    expect(createRound(mulberry32(11)).year).toBe(
      createRound(mulberry32(11)).year,
    );
    const used = [1950, 1951, 1952, 1953];
    for (let seed = 1; seed <= 10; seed++) {
      expect(used).not.toContain(createRound(mulberry32(seed), used).year);
    }
  });
});

describe("judging a guess", () => {
  test("bands widen with the distance", () => {
    expect(band(0)).toBe("exact");
    expect(band(3)).toBe("within 3 years");
    expect(band(4)).toBe("within 10 years");
    expect(band(10)).toBe("within 10 years");
    expect(band(11)).toBe("within 25 years");
    expect(band(25)).toBe("within 25 years");
    expect(band(26)).toBe("more than 25 years off");
  });

  test("direction points at the truth", () => {
    expect(judge(1970, 1960).direction).toBe("later");
    expect(judge(1970, 1980).direction).toBe("earlier");
    expect(judge(1970, 1970)).toEqual({
      direction: "exact",
      diff: 0,
      band: "exact",
    });
  });
});

describe("a round", () => {
  const base = () => ({ ...createRound(mulberry32(3)), year: 1970 });

  test("a right guess ends it and scores the full base", () => {
    const round = submitGuess(base(), 1970);
    expect(round.solved).toBe(true);
    expect(round.finished).toBe(true);
    expect(roundScore(round)).toBe(BASE_SCORE);
  });

  test("four wrong guesses end it without points", () => {
    let round = base();
    for (let i = 0; i < MAX_GUESSES; i++) round = submitGuess(round, 1980);
    expect(round.guesses).toHaveLength(MAX_GUESSES);
    expect(round.finished).toBe(true);
    expect(round.solved).toBe(false);
    expect(roundScore(round)).toBe(0);
  });

  test("a finished round ignores further guesses", () => {
    const round = submitGuess(base(), 1970);
    expect(submitGuess(round, 1990)).toBe(round);
  });

  test("guesses are rounded and clamped to the playable range", () => {
    expect(submitGuess(base(), 1969.6).guesses).toEqual([1970]);
    expect(submitGuess(base(), 1800).guesses).toEqual([FIRST_YEAR]);
    expect(submitGuess(base(), 3000).guesses).toEqual([LAST_YEAR]);
  });

  test("each extra panel and wrong guess costs points, with a floor", () => {
    const withPanel = submitGuess(addPanel(base(), "people"), 1970);
    expect(extraPanelsUsed(withPanel)).toBe(1);
    expect(roundScore(withPanel)).toBe(BASE_SCORE - EXTRA_PANEL_COST);

    const withBoth = submitGuess(
      submitGuess(addPanel(base(), "people"), 1980),
      1970,
    );
    expect(roundScore(withBoth)).toBe(
      BASE_SCORE - EXTRA_PANEL_COST - WRONG_GUESS_COST,
    );

    let thin = base();
    for (const category of ["people", "planet", "technology"] as const) {
      thin = addPanel(thin, category);
    }
    expect(thin.panels).toHaveLength(START_PANELS + MAX_EXTRA_PANELS);
    expect(extraOptions(thin)).toEqual([]);
    // further asks are no-ops
    expect(addPanel(thin, "people")).toBe(thin);
    // 3 extra panels: 1000 - 3 * 80
    expect(roundScore(submitGuess(thin, 1970))).toBe(
      BASE_SCORE - 3 * EXTRA_PANEL_COST,
    );
  });

  test("extra panels are measured and not already on the table", () => {
    const round = base();
    const options = extraOptions(round);
    expect(options.length).toBeGreaterThan(0);
    const category = options[0];
    if (category === undefined) throw new Error("no option");
    const next = addPanel(round, category);
    expect(next.panels).toHaveLength(START_PANELS + 1);
    const added = next.panels[next.panels.length - 1];
    if (added === undefined) throw new Error("nothing added");
    expect(next.panels.indexOf(added)).toBe(next.panels.length - 1);
    expect(valueAt(indicatorById(added), round.year)).toBeDefined();
  });

  test("a finished round offers no extra panels", () => {
    const round = submitGuess(base(), 1970);
    expect(extraOptions(round)).toEqual([]);
    expect(addPanel(round, "people")).toBe(round);
  });

  test("total is the sum over rounds", () => {
    const a = submitGuess(base(), 1970);
    const b = submitGuess(submitGuess({ ...base(), year: 2000 }, 1990), 2000);
    expect(totalScore([a, b])).toBe(
      BASE_SCORE + (BASE_SCORE - WRONG_GUESS_COST),
    );
  });
});

describe("the game shape", () => {
  test("six rounds, three starting panels, four guesses", () => {
    expect(ROUNDS).toBe(6);
    expect(START_PANELS).toBe(3);
    expect(MAX_GUESSES).toBe(4);
  });
});
