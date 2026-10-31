/**
 * Builds src/data/world.ts from published datasets.
 *
 * The game shows a handful of world indicators for a hidden year, so every
 * panel must be a real measured value, not an estimate typed from memory.
 * Sources are fetched at build time and the result is committed, so the
 * deployed bundle needs no network.
 *
 * Run: bun scripts/build-world-data.ts
 */

const FIRST_YEAR = 1950;
const LAST_YEAR = 2023;

type Format =
  | "people"
  | "percent"
  | "years"
  | "ppm"
  | "celsius"
  | "kwh"
  | "children"
  | "per100"
  | "kg"
  | "per1000"
  | "meters";

interface Spec {
  id: string;
  label: string;
  /** Shown under the panel after the year is revealed. */
  hint: string;
  format: Format;
  category: "people" | "planet" | "technology";
  source: string;
  /** OWID grapher slug, or a special handler. */
  owid?: string;
  handler?: "noaa-co2" | "tallest-building";
  /** OWID column to read when the CSV carries several numeric columns. */
  column?: string;
}

const SPECS: Spec[] = [
  {
    id: "population",
    label: "World population",
    hint: "United Nations World Population Prospects, via Our World in Data.",
    format: "people",
    category: "people",
    source: "UN WPP / OWID",
    owid: "population",
    column: "population_historical",
  },
  {
    id: "life_expectancy",
    label: "Life expectancy at birth",
    hint: "Global average, both sexes, UN WPP.",
    format: "years",
    category: "people",
    source: "UN WPP / OWID",
    owid: "life-expectancy",
    column: "life_expectancy_0",
  },
  {
    id: "child_mortality",
    label: "Children dying before age five",
    hint: "Share of children who die before their fifth birthday.",
    format: "percent",
    category: "people",
    source: "UN IGME / OWID",
    owid: "child-mortality",
    column: "child_mortality_rate",
  },
  {
    id: "fertility",
    label: "Children per woman",
    hint: "Global total fertility rate.",
    format: "children",
    category: "people",
    source: "UN WPP / OWID",
    owid: "children-per-woman",
    column: "fertility_rate__sex_all__age_all__variant_estimates",
  },
  {
    id: "schooling",
    label: "Years of schooling",
    hint: "Average years of education among adults aged 15-64.",
    format: "years",
    category: "people",
    source: "Lee-Lee / Barro-Lee via OWID",
    owid: "mean-years-of-schooling-long-run",
    column: "mf_youth_and_adults__15_64_years__average_years_of_education",
  },
  {
    id: "urban",
    label: "People living in cities",
    hint: "Share of the world population in urban areas.",
    format: "percent",
    category: "planet",
    source: "UN World Urbanization Prospects / OWID",
    owid: "share-of-population-urban",
    column: "share__area_type_urban__data_type_estimates",
  },
  {
    id: "co2",
    label: "CO\u2082 in the air",
    hint: "Annual mean at Mauna Loa, Hawaii: the Keeling curve, NOAA GML.",
    format: "ppm",
    category: "planet",
    source: "NOAA GML",
    handler: "noaa-co2",
  },
  {
    id: "warming",
    label: "Global temperature rise",
    hint: "Near-surface temperature anomaly against the 1850-1900 average.",
    format: "celsius",
    category: "planet",
    source: "Met Office Hadley Centre / OWID",
    owid: "temperature-anomaly",
    column: "near_surface_temperature_anomaly",
  },
  {
    id: "poverty",
    label: "People in extreme poverty",
    hint: "Share of the world living below $3.00 a day (2021 prices).",
    format: "percent",
    category: "planet",
    source: "World Bank PIP / OWID",
    owid: "share-of-population-in-extreme-poverty",
    column:
      "headcount_ratio__ppp_version_2021__poverty_line_300__welfare_type_income_or_consumption__table_income_or_consumption_consolidated__survey_comparability_no_spells",
  },
  {
    id: "meat",
    label: "Meat eaten per person",
    hint: "Food available for consumption, kilograms per person per year.",
    format: "kg",
    category: "planet",
    source: "FAO / OWID",
    owid: "meat-supply-per-person",
    column:
      "meat__total__00002943__food_available_for_consumption__0645pc__kilograms_per_year_per_capita",
  },
  {
    id: "electricity",
    label: "Electricity per person",
    hint: "Annual electricity generation divided by world population.",
    format: "kwh",
    category: "technology",
    source: "Ember / Energy Institute / OWID",
    owid: "per-capita-electricity-generation",
    column: "per_capita_total_generation__kwh",
  },
  {
    id: "renewables",
    label: "Renewable electricity",
    hint: "Share of world electricity from renewables (hydro, wind, solar, bio).",
    format: "percent",
    category: "technology",
    source: "Ember / Energy Institute / OWID",
    owid: "share-electricity-renewables",
    column: "renewable_share_of_electricity__pct",
  },
  {
    id: "electricity_access",
    label: "People with electricity at home",
    hint: "Share of the world population with access to electricity.",
    format: "percent",
    category: "technology",
    source: "World Bank / OWID",
    owid: "share-of-the-population-with-access-to-electricity",
    column: "eg_elc_accs_zs",
  },
  {
    id: "internet",
    label: "People using the internet",
    hint: "Share of the world population using the internet in the last months.",
    format: "percent",
    category: "technology",
    source: "ITU / World Bank / OWID",
    owid: "share-of-individuals-using-the-internet",
    column: "it_net_user_zs",
  },
  {
    id: "mobile",
    label: "Mobile subscriptions",
    hint: "Active SIM cards per 100 people; above 100 means more cards than people.",
    format: "per100",
    category: "technology",
    source: "ITU / World Bank / OWID",
    owid: "mobile-cellular-subscriptions-per-100-people",
    column: "it_cel_sets_p2",
  },
  {
    id: "tallest",
    label: "Tallest building in the world",
    hint: "Height of the tallest completed building at the time.",
    format: "meters",
    category: "technology",
    source: "CTBUH records",
    handler: "tallest-building",
  },
];

/** Height of the world's tallest building, by the year it took the title. */
const TALLEST: [number, number, string][] = [
  [1950, 381, "Empire State Building"],
  [1971, 417, "World Trade Center"],
  [1974, 442, "Sears Tower"],
  [1998, 452, "Petronas Towers"],
  [2004, 508, "Taipei 101"],
  [2010, 828, "Burj Khalifa"],
];

type Series = [number, number][];

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return await res.text();
}

/** Reads the World row out of an OWID grapher CSV. */
function parseOwid(csv: string, column?: string): Series {
  const lines = csv.trim().split("\n");
  const header = lines[0]?.split(",") ?? [];
  if (header[0] !== "entity") {
    throw new Error(`not an OWID CSV: ${lines[0]?.slice(0, 80)}`);
  }
  const yearIdx = header.indexOf("year");
  let valueIdx = column === undefined ? -1 : header.indexOf(column);
  if (valueIdx < 0) {
    // First numeric column that is not a helper column.
    const skip = new Set(["population_historical", "owid_region"]);
    valueIdx = header.findIndex(
      (name, i) => i > 2 && !skip.has(name) && name !== "",
    );
  }
  if (yearIdx < 0 || valueIdx < 0) {
    throw new Error(`unexpected columns: ${header.join(",")}`);
  }
  const out: Series = [];
  for (const line of lines.slice(1)) {
    const cells = line.split(",");
    if (cells[0] !== "World") continue;
    const raw = cells[valueIdx];
    // Empty cells mean "no measurement"; Number("") is 0, which would fake data.
    if (raw === undefined || raw === "") continue;
    const year = Number(cells[yearIdx]);
    const value = Number(raw);
    if (!Number.isFinite(year) || !Number.isFinite(value)) continue;
    if (year < FIRST_YEAR || year > LAST_YEAR) continue;
    out.push([year, value]);
  }
  out.sort((a, b) => a[0] - b[0]);
  return out;
}

/** NOAA GML annual global mean CO2, one row per year after the comment block. */
function parseNoaaCo2(csv: string): Series {
  const out: Series = [];
  for (const line of csv.split("\n")) {
    if (line.startsWith("#") || line.trim() === "") continue;
    const cells = line.split(",");
    const year = Number(cells[0]);
    const value = Number(cells[1]);
    if (!Number.isFinite(year) || !Number.isFinite(value)) continue;
    if (year < FIRST_YEAR || year > LAST_YEAR) continue;
    out.push([year, value]);
  }
  out.sort((a, b) => a[0] - b[0]);
  return out;
}

function tallestSeries(): Series {
  const out: Series = [];
  for (let year = FIRST_YEAR; year <= LAST_YEAR; year++) {
    let height = TALLEST[0]?.[1] ?? 0;
    for (const [from, value] of TALLEST) {
      if (year >= from) height = value;
    }
    out.push([year, height]);
  }
  return out;
}

function round(value: number): number {
  if (Math.abs(value) >= 1000) return Math.round(value);
  if (Math.abs(value) >= 100) return Math.round(value * 10) / 10;
  return Math.round(value * 1000) / 1000;
}

async function build(): Promise<void> {
  const blocks: string[] = [];
  const report: string[] = [];

  for (const spec of SPECS) {
    let series: Series;
    if (spec.handler === "noaa-co2") {
      series = parseNoaaCo2(
        await fetchText(
          "https://gml.noaa.gov/webdata/ccgg/trends/co2/co2_annmean_mlo.csv",
        ),
      );
    } else if (spec.handler === "tallest-building") {
      series = tallestSeries();
    } else if (spec.owid !== undefined) {
      const csv = await fetchText(
        `https://ourworldindata.org/grapher/${spec.owid}.csv?csvType=full&useColumnShortNames=true`,
      );
      series = parseOwid(csv, spec.column);
    } else {
      throw new Error(`no source for ${spec.id}`);
    }

    if (series.length < 10) {
      throw new Error(`${spec.id}: only ${series.length} years of data`);
    }
    const first = series[0]?.[0] ?? 0;
    const last = series[series.length - 1]?.[0] ?? 0;
    report.push(
      `${spec.id.padEnd(20)} ${String(series.length).padStart(3)} years  ${first}-${last}  first ${series[0]?.[1]}  last ${series[series.length - 1]?.[1]}`,
    );

    const values = series
      .map(([year, value]) => `    [${year}, ${round(value)}],`)
      .join("\n");
    blocks.push(`  {
    id: "${spec.id}",
    label: ${JSON.stringify(spec.label)},
    hint: ${JSON.stringify(spec.hint)},
    format: "${spec.format}",
    category: "${spec.category}",
    source: ${JSON.stringify(spec.source)},
    values: [
${values}
    ],
  },`);
  }

  const file = `// Generated by scripts/build-world-data.ts; do not edit by hand.
// Sources: Our World in Data grapher CSVs, NOAA GML, CTBUH records.

export const FIRST_YEAR = ${FIRST_YEAR};
export const LAST_YEAR = ${LAST_YEAR};

export type IndicatorFormat =
  | "people"
  | "percent"
  | "years"
  | "ppm"
  | "celsius"
  | "kwh"
  | "children"
  | "per100"
  | "kg"
  | "per1000"
  | "meters";

export type Category = "people" | "planet" | "technology";

export interface Indicator {
  id: string;
  label: string;
  hint: string;
  format: IndicatorFormat;
  category: Category;
  source: string;
  /** [year, value] pairs, ascending, only years with a measurement. */
  values: [number, number][];
}

export const INDICATORS: Indicator[] = [
${blocks.join("\n")}
];
`;

  await Bun.write("src/data/world.ts", file);
  console.log(report.join("\n"));
  console.log(`\nwrote src/data/world.ts (${SPECS.length} indicators)`);
}

await build();
