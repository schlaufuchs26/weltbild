# 🦊 Weltbild

Guess the year from the state of the world.

Each round deals a handful of world statistics, all measured in the same
hidden year: population, life expectancy, CO₂ in the air, internet users,
electricity per person, the tallest building, and so on. Read the panels, name
the year. Six rounds, one guess each, scored by how close it lands.

**Play:** https://schlaufuchs26.github.io/weltbild/

## How a round works

- Three panels open at the start, one from each group: **people**, **planet**,
  **technology**.
- You may ask for up to three more panels, each costs 80 points. You pick the
  group, so you can chase the clue you trust.
- One guess per round, and it is final. There is no earlier/later hint and no
  second attempt: the round ends with the points your distance earned.
- The score falls with the gap: exact pays 1000, 1-2 years off 900, 3-5 off
  750, 6-10 off 450, 11-20 off 200, 21-40 off 80, further nothing. Extra
  panels come off that.
- The reveal shows each panel's full history from 1950 to 2023 with the true
  year marked, so you can see what the number was doing.
- The score screen lists per round the year, your guess, the gap and the
  points, plus a total and a one-line verdict.

## Inference routes

A round is only fair if a player can get there from more than one direction.
Two routes, and the first one needs no specialist knowledge:

1. **Read the technology panel.** Internet users, mobile subscriptions,
   electricity per person, household electricity access and the tallest
   building are self-dating: 15 % online cannot be 1990, 110 mobile
   subscriptions per 100 people cannot be 2005, and 442 m is a building
   completed in 1974. Anyone who has lived through the last forty years can
   place these within a few years without knowing any history.
2. **Use the scale panels as a second opinion.** World population doubles
   between 1950 and 2023 (2.5 to 8.1 billion), life expectancy climbs from
   46 to 73 years, and CO₂ passes 400 ppm only after 2015. The combination
   of two or three of these pins the decade even when a single panel is
   ambiguous.

A third route exists for players who like it: the *absence* of a panel is a
clue. Poverty, CO₂ and electricity access have no values before 1990, 1959 and
1998, so a round that hides them is probably older than that.

## Data

`src/data/world.ts` is generated, not typed by hand: `bun scripts/build-world-data.ts`
downloads the published series and writes the table.

- Our World in Data grapher CSVs: UN World Population Prospects (population,
  life expectancy, fertility), UN IGME (child mortality), World Bank (poverty,
  electricity access, internet, mobile), FAO (meat), Ember and the Energy
  Institute (electricity, renewables), Met Office Hadley Centre (temperature
  anomaly), Barro-Lee (years of schooling), UN World Urbanization Prospects
  (urban share).
- NOAA GML, Mauna Loa annual mean CO₂.
- CTBUH height records for the tallest building, hand-tabulated in
  `scripts/build-world-data.ts`.

Values are as published; the game only formats them. Missing years are left
missing, so a panel with no measurement in the hidden year stays off the table.

## Development

```bash
bun install
bun dev          # http://localhost:3000
bun test         # unit and component tests (happy-dom)
bun run checks   # format, tsc, biome, knip, tests
bun run build    # static bundle in dist/
```

Built from [`frontend-template`](https://github.com/schlaufuchs26/frontend-template)
(Bun + TypeScript + React 19). Deployed to GitHub Pages by
`.github/workflows/deploy.yml` on every push to `main`.
