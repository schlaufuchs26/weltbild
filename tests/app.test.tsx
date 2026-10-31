import { describe, expect, test } from "bun:test";
import { fireEvent, render, screen } from "@testing-library/react";
import { App } from "../frontend";
import { GameView } from "../src/components/GameView";
import { Sparkline } from "../src/components/PanelCard";
import type { Indicator } from "../src/data/world";
import { createRound, mulberry32 } from "../src/game";

describe("App", () => {
  test("renders the title and the rules", () => {
    render(<App />);
    expect(
      screen.getByRole("heading", { name: /Weltbild/ }),
    ).toBeInTheDocument();
    expect(screen.getByText(/The world in one year/)).toBeInTheDocument();
    expect(screen.getByText(/1950/)).toBeInTheDocument();
  });

  test("deals three panels and a guess control", () => {
    render(<App />);
    expect(screen.getAllByRole("article")).toHaveLength(3);
    expect(screen.getByRole("button", { name: "Guess" })).toBeInTheDocument();
    expect(screen.getByRole("slider")).toBeInTheDocument();
    expect(screen.getByText("Round 1 / 6")).toBeInTheDocument();
  });
});

describe("GameView", () => {
  // The view draws its first round from the same seed, so the test knows the
  // hidden year without reaching into component state.
  const seed = 7;
  const year = createRound(mulberry32(seed)).year;

  function guess(value: number) {
    fireEvent.change(screen.getByLabelText("Year"), {
      target: { value: String(value) },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guess" }));
  }

  test("one guess ends the round with its distance and points", () => {
    render(<GameView rounds={1} rng={mulberry32(seed)} />);
    const miss = year < 2000 ? 2020 : 1960;
    guess(miss);
    const gap = Math.abs(miss - year);
    expect(
      screen.getByText(`Off by ${gap} years; the year was`),
    ).toBeInTheDocument();
    expect(
      screen.getByText(new RegExp(`you said ${miss}`)),
    ).toBeInTheDocument();
    // the guess control is gone: there is no second attempt
    expect(screen.queryByRole("button", { name: "Guess" })).toBeNull();
    expect(screen.queryByRole("slider")).toBeNull();
  });

  test("an exact guess is called dead on and pays the base score", () => {
    render(<GameView rounds={1} rng={mulberry32(seed)} />);
    guess(year);
    expect(screen.getByText("Dead on; the year was")).toBeInTheDocument();
    expect(screen.getAllByText(String(year)).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "See the score" }));
    expect(screen.getByTestId("total-score").textContent).toBe("1000 / 1000");
    fireEvent.click(screen.getByRole("button", { name: "Play again" }));
    expect(screen.getByText("Round 1 / 1")).toBeInTheDocument();
  });

  test("the score screen lists guess, year, gap and points per round", () => {
    render(<GameView rounds={1} rng={mulberry32(seed)} />);
    const miss = year < 2000 ? 2020 : 1960;
    guess(miss);
    fireEvent.click(screen.getByRole("button", { name: "See the score" }));
    const table = screen.getByRole("table");
    const cells = [...table.querySelectorAll("tbody td")].map(
      (cell) => cell.textContent,
    );
    expect(cells[0]).toBe(String(year));
    expect(cells[1]).toBe(String(miss));
    expect(cells[2]).toBe(`${Math.abs(miss - year)} yr`);
    expect(cells[4]).toBe("0");
    // a verdict line follows the total
    expect(
      screen.getByText(/without you|whisker|Sharp|Solid|era|Rough/),
    ).toBeInTheDocument();
  });

  test("asking for another panel adds a card", () => {
    render(<GameView rounds={1} rng={mulberry32(seed)} />);
    expect(screen.getAllByRole("article")).toHaveLength(3);
    fireEvent.click(screen.getByRole("button", { name: "people" }));
    expect(screen.getAllByRole("article")).toHaveLength(4);
    expect(screen.getByText(/Ask for more \(2 left\)/)).toBeInTheDocument();
  });

  test("the panel cards show a value and, once revealed, a chart", () => {
    render(<GameView rounds={1} rng={mulberry32(seed)} />);
    // Before the reveal there is no history chart.
    expect(screen.queryAllByRole("img")).toHaveLength(0);
    guess(year);
    expect(screen.getAllByRole("img")).toHaveLength(3);
  });
});

describe("Sparkline", () => {
  test("draws a point per measured year", () => {
    const indicator: Indicator = {
      id: "population",
      label: "Test",
      hint: "hint",
      format: "people",
      category: "people",
      source: "test",
      values: [
        [2000, 6_000_000_000],
        [2001, 6_100_000_000],
        [2002, 6_200_000_000],
      ],
    };
    const { container } = render(
      <Sparkline indicator={indicator} year={2001} />,
    );
    expect(container.querySelectorAll("circle")).toHaveLength(1);
    expect(container.querySelectorAll("polyline")).toHaveLength(1);
  });

  test("an empty series draws nothing", () => {
    const indicator: Indicator = {
      id: "population",
      label: "Test",
      hint: "hint",
      format: "people",
      category: "people",
      source: "test",
      values: [],
    };
    const { container } = render(
      <Sparkline indicator={indicator} year={2001} />,
    );
    expect(container.querySelector("svg")).toBeNull();
  });
});
