import { useMemo, useState } from "react";
import { type Category, FIRST_YEAR, LAST_YEAR } from "../data/world";
import { formatYear } from "../format";
import {
  addPanel,
  BASE_SCORE,
  CATEGORY_LABELS,
  createRound,
  EXTRA_PANEL_COST,
  extraOptions,
  extraPanelsUsed,
  indicatorById,
  isFinished,
  MAX_EXTRA_PANELS,
  ROUNDS,
  type Round,
  roundScore,
  scoreFor,
  submitGuess,
  totalScore,
  totalVerdict,
} from "../game";
import { PanelCard } from "./PanelCard";

interface GameProps {
  rounds?: number;
  rng?: () => number;
}

/** "Off by 4 years" / "Dead on" for a scored round. */
function gapText(diff: number): string {
  if (diff === 0) return "Dead on";
  return `Off by ${diff} ${diff === 1 ? "year" : "years"}`;
}

function guessText(round: Round): string {
  return round.guess === null ? "\u2014" : formatYear(round.guess);
}

export function GameView({ rounds = ROUNDS, rng = Math.random }: GameProps) {
  const [played, setPlayed] = useState<Round[]>([]);
  const [current, setCurrent] = useState<Round | null>(() => createRound(rng));
  const [guess, setGuess] = useState(1980);

  const score = useMemo(() => totalScore(played), [played]);
  const max = rounds * BASE_SCORE;

  function handleGuess() {
    if (current === null || isFinished(current)) return;
    setCurrent(submitGuess(current, guess));
  }

  function handleExtra(category: Category) {
    if (current === null) return;
    setCurrent(addPanel(current, category, rng));
  }

  function handleNext() {
    if (current === null) return;
    const done = [...played, current];
    setPlayed(done);
    setGuess(1980);
    if (done.length >= rounds) {
      setCurrent(null);
      return;
    }
    setCurrent(
      createRound(
        rng,
        done.map((round) => round.year),
      ),
    );
  }

  function handleRestart() {
    setPlayed([]);
    setGuess(1980);
    setCurrent(createRound(rng));
  }

  if (current === null) {
    return (
      <section className="summary">
        <p className="summary-label">Six years, guessed</p>
        <p className="summary-score" data-testid="total-score">
          {score} / {max}
        </p>
        <table className="summary-table">
          <thead>
            <tr>
              <th>Year</th>
              <th>You said</th>
              <th>Gap</th>
              <th>Panels</th>
              <th>Points</th>
            </tr>
          </thead>
          <tbody>
            {played.map((round) => {
              const result =
                round.guess === null ? null : scoreFor(round.guess, round.year);
              return (
                <tr key={round.year}>
                  <td>{formatYear(round.year)}</td>
                  <td>{guessText(round)}</td>
                  <td>
                    {result === null
                      ? "\u2014"
                      : result.diff === 0
                        ? "exact"
                        : `${result.diff} yr`}
                  </td>
                  <td>{round.panels.length}</td>
                  <td>{roundScore(round)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="summary-verdict">{totalVerdict(score, max)}</p>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleRestart}
        >
          Play again
        </button>
      </section>
    );
  }

  const open = isFinished(current);
  const result =
    current.guess === null ? null : scoreFor(current.guess, current.year);
  const options = extraOptions(current);
  const extrasLeft = MAX_EXTRA_PANELS - extraPanelsUsed(current);

  return (
    <section className="game">
      <div className="topbar">
        <p className="round-label">
          Round {played.length + 1} / {rounds}
        </p>
        <p className="score-label">{score} points</p>
      </div>

      <div className="panels">
        {current.panels.map((id) => (
          <PanelCard
            key={id}
            indicator={indicatorById(id)}
            year={current.year}
            open={open}
          />
        ))}
      </div>

      {open && result !== null ? (
        <div className="reveal">
          <p className="reveal-label">{gapText(result.diff)}; the year was</p>
          <p className="reveal-year">{formatYear(current.year)}</p>
          <p className="reveal-points">
            you said {guessText(current)} · {result.verdict} · +
            {roundScore(current)} points · {current.panels.length} panels
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleNext}
          >
            {played.length + 1 >= rounds ? "See the score" : "Next year"}
          </button>
        </div>
      ) : (
        <div className="guessbox">
          <div className="guess-row">
            <label className="slider-label" htmlFor="year-slider">
              Your year
            </label>
            <input
              id="year-slider"
              className="slider"
              type="range"
              min={FIRST_YEAR}
              max={LAST_YEAR}
              value={guess}
              onChange={(event) => setGuess(Number(event.target.value))}
            />
            <input
              className="num"
              type="number"
              aria-label="Year"
              min={FIRST_YEAR}
              max={LAST_YEAR}
              value={guess}
              onChange={(event) => {
                const value = Number(event.target.value);
                if (Number.isFinite(value)) setGuess(value);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") handleGuess();
              }}
            />
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleGuess}
            >
              Guess
            </button>
          </div>
          <p className="meta">
            One guess, scored by how close it lands: exact pays {BASE_SCORE}, a
            near miss most of it, a decade off little. Extra panels cost{" "}
            {EXTRA_PANEL_COST} each.
          </p>
          {options.length > 0 && (
            <div className="extras">
              <span className="extras-label">
                Ask for more ({extrasLeft} left):
              </span>
              {options.map((category) => (
                <button
                  key={category}
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => handleExtra(category)}
                >
                  {CATEGORY_LABELS[category]}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
