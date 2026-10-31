import { describe, expect, test } from "bun:test";
import { FIRST_YEAR, INDICATORS, LAST_YEAR } from "../src/data/world";
import {
  addPanel,
  BASE_SCORE,
  CATEGORIES,
  createRound,
  EXTRA_PANEL_COST,
  extraOptions,
  extraPanelsUsed,
  indicatorById,
  indicatorsAt,
  isFinished,
  MAX_EXTRA_PANELS,
  mulberry32,
  ROUNDS,
  roundScore,
  START_PANELS,
  scoreFor,
  submitGuess,
  totalScore,
  totalVerdict,
  valueAt,
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

describe("scoring a guess", () => {
  test("the score falls with the distance", () => {
    expect(scoreFor(1970, 1970).points).toBe(BASE_SCORE);
    const ladder = [0, 1, 3, 5, 10, 20, 40, 41, 73].map(
      (diff) => scoreFor(1970 + diff, 1970).points,
    );
    // monotone: a farther year never pays more than a nearer one
    for (let i = 1; i < ladder.length; i++) {
      const previous = ladder[i - 1];
      const current = ladder[i];
      if (previous === undefined || current === undefined) {
        throw new Error("ladder hole");
      }
      expect(current).toBeLessThanOrEqual(previous);
    }
    expect(ladder[0]).toBeGreaterThan(ladder[ladder.length - 1] ?? 0);
  });

  test("a near miss keeps most of the score, a decade off little", () => {
    expect(scoreFor(1972, 1970).points).toBe(900);
    expect(scoreFor(1975, 1970).points).toBe(750);
    expect(scoreFor(1980, 1970).points).toBeLessThanOrEqual(BASE_SCORE * 0.45);
    expect(scoreFor(2010, 1970).points).toBe(80);
    expect(scoreFor(2020, 1970).points).toBe(0);
    expect(scoreFor(1900, 1970).points).toBe(0);
  });

  test("distance is absolute and symmetric", () => {
    expect(scoreFor(1960, 1970)).toEqual(scoreFor(1980, 1970));
    expect(scoreFor(1960, 1970).diff).toBe(10);
    expect(scoreFor(1969.6, 1970).diff).toBe(0);
  });

  test("each tier carries a verdict", () => {
    expect(scoreFor(1970, 1970).verdict).toBe("dead on");
    expect(scoreFor(1971, 1970).verdict).toBe("a whisker away");
    expect(scoreFor(1980, 1970).verdict).toBe(
      "the right decade, the wrong year",
    );
    expect(scoreFor(1900, 1970).verdict).toBe("another era");
  });
});

describe("a round", () => {
  const base = () => ({ ...createRound(mulberry32(3)), year: 1970 });

  test("an exact guess ends it and scores the full base", () => {
    const round = submitGuess(base(), 1970);
    expect(isFinished(round)).toBe(true);
    expect(round.guess).toBe(1970);
    expect(roundScore(round)).toBe(BASE_SCORE);
  });

  test("a near miss ends it too, with the points for its distance", () => {
    const round = submitGuess(base(), 1974);
    expect(isFinished(round)).toBe(true);
    expect(roundScore(round)).toBe(750);
  });

  test("a second guess on the same round is impossible", () => {
    const round = submitGuess(base(), 1960);
    expect(submitGuess(round, 1970)).toBe(round);
    expect(submitGuess(round, 1970).guess).toBe(1960);
    expect(roundScore(submitGuess(round, 1970))).toBe(
      scoreFor(1960, 1970).points,
    );
  });

  test("guesses are rounded and clamped to the playable range", () => {
    expect(submitGuess(base(), 1969.6).guess).toBe(1970);
    expect(submitGuess(base(), 1800).guess).toBe(FIRST_YEAR);
    expect(submitGuess(base(), 3000).guess).toBe(LAST_YEAR);
  });

  test("each extra panel costs points, with a floor", () => {
    const withPanel = submitGuess(addPanel(base(), "people"), 1970);
    expect(extraPanelsUsed(withPanel)).toBe(1);
    expect(roundScore(withPanel)).toBe(BASE_SCORE - EXTRA_PANEL_COST);

    // a panel bought on a wide miss eats the little the distance paid
    const wideMiss = submitGuess(addPanel(base(), "people"), 2000);
    expect(roundScore(wideMiss)).toBe(0);

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
    const b = submitGuess({ ...base(), year: 2000 }, 1990);
    expect(totalScore([a, b])).toBe(BASE_SCORE + scoreFor(1990, 2000).points);
    expect(totalScore([base()])).toBe(0);
  });
});

describe("the round verdict", () => {
  test("falls from praise to shrug with the share", () => {
    const max = ROUNDS * BASE_SCORE;
    const verdicts = [1, 0.85, 0.65, 0.4, 0.15, 0].map((share) =>
      totalVerdict(share * max, max),
    );
    expect(new Set(verdicts).size).toBe(verdicts.length);
    expect(verdicts[0]).toContain("whisker");
    expect(verdicts[verdicts.length - 1]).toContain("without you");
  });
});

describe("the game shape", () => {
  test("six rounds, three starting panels, one guess", () => {
    expect(ROUNDS).toBe(6);
    expect(START_PANELS).toBe(3);
    const round = createRound(mulberry32(5));
    expect(round.guess).toBeNull();
    expect(isFinished(round)).toBe(false);
  });
});
