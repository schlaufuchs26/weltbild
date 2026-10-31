import type { Indicator } from "../data/world";
import { captionFor } from "../facts";
import { formatValue } from "../format";
import { valueAt } from "../game";

const W = 260;
const H = 56;
const PAD = 6;

interface SparkProps {
  indicator: Indicator;
  year: number;
}

/** The indicator's whole history, with the hidden year marked. */
export function Sparkline({ indicator, year }: SparkProps) {
  const values = indicator.values;
  const first = values[0];
  const last = values[values.length - 1];
  if (first === undefined || last === undefined) return null;
  const firstYear = first[0];
  const lastYear = last[0];
  const span = Math.max(1, lastYear - firstYear);

  const numbers = values.map(([, value]) => value);
  const min = Math.min(...numbers);
  const max = Math.max(...numbers);
  const range = max - min || 1;

  const x = (y: number) => PAD + ((y - firstYear) / span) * (W - PAD * 2);
  const y = (value: number) =>
    H - PAD - ((value - min) / range) * (H - PAD * 2);

  const points = values
    .map(([year_, value]) => `${x(year_).toFixed(1)},${y(value).toFixed(1)}`)
    .join(" ");

  const markerValue = valueAt(indicator, year) ?? min;
  const markerX = x(Math.min(Math.max(year, firstYear), lastYear));
  const markerY = y(markerValue);

  return (
    <div className="spark-wrap">
      <svg
        className="spark"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`${indicator.label}, ${firstYear} to ${lastYear}`}
      >
        <title>{`${indicator.label}, ${firstYear} to ${lastYear}`}</title>
        <polyline className="spark-line" points={points} />
        <line
          className="spark-marker"
          x1={markerX}
          x2={markerX}
          y1={2}
          y2={H - 2}
        />
        <circle className="spark-dot" cx={markerX} cy={markerY} r={3.2} />
      </svg>
      <p className="spark-ends">
        <span>
          {firstYear}: {formatValue(first[1], indicator.format)}
        </span>
        <span>
          {lastYear}: {formatValue(last[1], indicator.format)}
        </span>
      </p>
    </div>
  );
}

interface PanelProps {
  indicator: Indicator;
  year: number;
  open: boolean;
}

export function PanelCard({ indicator, year, open }: PanelProps) {
  const value = valueAt(indicator, year);
  const caption = captionFor(indicator, year);

  return (
    <article className={`panel${open ? " panel-open" : ""}`}>
      <header className="panel-head">
        <span className={`tag tag-${indicator.category}`}>
          {indicator.category}
        </span>
        <h3>{indicator.label}</h3>
      </header>
      <p className="panel-value">
        {value === undefined ? "\u2014" : formatValue(value, indicator.format)}
      </p>
      {caption !== undefined && <p className="panel-caption">{caption}</p>}
      {open && <Sparkline indicator={indicator} year={year} />}
      {open && <p className="panel-hint">{indicator.hint}</p>}
    </article>
  );
}
