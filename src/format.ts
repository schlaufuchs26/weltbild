import type { IndicatorFormat } from "./data/world";

/** Three significant digits: enough to compare, short enough for a card. */
function sig(value: number, digits = 3): string {
  if (value === 0) return "0";
  const magnitude = Math.floor(Math.log10(Math.abs(value)));
  const decimals = Math.max(0, digits - 1 - magnitude);
  return value.toFixed(decimals);
}

function grouped(value: number): string {
  return new Intl.NumberFormat("en-US").format(Math.round(value));
}

export function formatValue(value: number, format: IndicatorFormat): string {
  switch (format) {
    case "people":
      if (Math.abs(value) >= 1e9) return `${(value / 1e9).toFixed(2)} billion`;
      if (Math.abs(value) >= 1e6) return `${(value / 1e6).toFixed(1)} million`;
      return grouped(value);
    case "percent":
      return `${value.toFixed(1)} %`;
    case "years":
      return `${value.toFixed(1)} years`;
    case "ppm":
      return `${Math.round(value)} ppm`;
    case "celsius": {
      const sign = value > 0 ? "+" : value < 0 ? "\u2212" : "";
      return `${sign}${Math.abs(value).toFixed(2)} \u00b0C`;
    }
    case "kwh":
      return `${grouped(value)} kWh`;
    case "children":
      return value.toFixed(2);
    case "per100":
      return `${sig(value)} per 100`;
    case "kg":
      return `${value.toFixed(1)} kg`;
    case "per1000":
      return `${sig(value)} per 1,000`;
    case "meters":
      return `${Math.round(value)} m`;
  }
}

/** "1950" - kept separate so the year reads as a year everywhere. */
export function formatYear(year: number): string {
  return String(Math.round(year));
}
