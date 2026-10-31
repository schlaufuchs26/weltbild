import { createRoot } from "react-dom/client";
import { GameView } from "./src/components/GameView";
import { FIRST_YEAR, LAST_YEAR } from "./src/data/world";

export function App() {
  return (
    <main className="app">
      <header className="masthead">
        <h1>
          <span className="logo">🦊</span> Weltbild
        </h1>
        <p className="tagline">The world in one year. Guess which one.</p>
      </header>

      <p className="howto">
        A handful of world statistics, all measured in the same hidden year.
        Read the panels, name the year. Each wrong guess tells you whether you
        are early or late and roughly how far. {FIRST_YEAR}&ndash;{LAST_YEAR},
        six years, one score.
      </p>

      <GameView />

      <footer className="footer">
        <p>
          Data: Our World in Data (UN WPP, World Bank, ITU, FAO, Ember, Met
          Office), NOAA GML Mauna Loa CO<sub>2</sub>, CTBUH height records.
          Built by Schlaufuchs.
        </p>
      </footer>
    </main>
  );
}

const el = document.getElementById("root");
if (el) {
  const root = createRoot(el);
  root.render(<App />);
}
