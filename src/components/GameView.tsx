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
  judge,
  MAX_EXTRA_PANELS,
  MAX_GUESSES,
  ROUNDS,
  type Round,
  roundScore,
  submitGuess,
  totalScore,
  WRONG_GUESS_COST,
} from "../game";
import { PanelCard } from "./PanelCard";

interface GameProps {
  rounds?: number;
  rng?: () => number;
}

function feedbackText(year: number, guess: number): string {
  const result = judge(year, guess);
  const direction = result.direction === "later" ? "Later" : "Earlier";
  return `${direction}, and ${result.band}.`;
}

function guessHistory(round: Round): string[] {
  return round.guesses.map((guess) => {
    const result = judge(round.year, guess);
    const arrow = result.direction === "later" ? "\u2191" : "\u2193";
    return `${guess} ${arrow} ${result.band}`;
  });
}

export function GameView({ rounds = ROUNDS, rng = Math.random }: GameProps) {
  const [played, setPlayed] = useState<Round[]>([]);
  const [current, setCurrent] = useState<Round | null>(() => createRound(rng));
  const [guess, setGuess] = useState(1980);
  const [note, setNote] = useState<string | null>(null);

  const score = useMemo(() => totalScore(played), [played]);

  function handleGuess() {
    if (current === null || current.finished) return;
    const next = submitGuess(current, guess);
    setCurrent(next);
    setNote(next.finished ? null : feedbackText(next.year, guess));
  }

  function handleExtra(category: Category) {
    if (current === null) return;
    setCurrent(addPanel(current, category, rng));
  }

  function handleNext() {
    if (current === null) return;
    const done = [...played, current];
    setPlayed(done);
    setNote(null);
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
    setNote(null);
    setGuess(1980);
    setCurrent(createRound(rng));
  }

  if (current === null) {
    return (
      <section className="summary">
        <p className="summary-label">Six years, guessed</p>
        <p className="summary-score" data-testid="total-score">
          {score} / {rounds * BASE_SCORE}
        </p>
        <table className="summary-table">
          <thead>
            <tr>
              <th>Year</th>
              <th>Guesses</th>
              <th>Panels</th>
              <th>Points</th>
            </tr>
          </thead>
          <tbody>
            {played.map((round) => (
              <tr key={round.year}>
                <td>{formatYear(round.year)}</td>
                <td>{round.solved ? round.guesses.length : "unsolved"}</td>
                <td>{round.panels.length}</td>
                <td>{roundScore(round)}</td>
              </tr>
            ))}
          </tbody>
        </table>
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

  const open = current.finished;
  const options = extraOptions(current);
  const extrasLeft = MAX_EXTRA_PANELS - extraPanelsUsed(current);
  const guessesLeft = MAX_GUESSES - current.guesses.length;

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

      {open ? (
        <div className="reveal">
          <p className="reveal-label">
            {current.solved ? "Solved" : "Out of guesses"}; the year was
          </p>
          <p className="reveal-year">{formatYear(current.year)}</p>
          <p className="reveal-points">
            +{roundScore(current)} points · {current.guesses.length}{" "}
            {current.guesses.length === 1 ? "guess" : "guesses"} ·{" "}
            {current.panels.length} panels
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
          {note !== null && (
            <p className="feedback" role="status">
              {note}
            </p>
          )}
          {current.guesses.length > 0 && (
            <ul className="history">
              {guessHistory(current).map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          )}
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
            {guessesLeft} {guessesLeft === 1 ? "guess" : "guesses"} left · wrong
            guesses cost {WRONG_GUESS_COST}, extra panels {EXTRA_PANEL_COST}
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
