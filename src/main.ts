/**
 * Entry point — wires the layers together so the toolchain proves out end to
 * end.
 *
 * This is not the shipped experience: there is no Three.js canvas, no pinch
 * handling, and no stage rendering yet. Those land once the vertical slice's
 * interaction surface is exercised against a real canvas. What is here is the
 * contract between the layers, driven by the one input path that exists in
 * the browser today — the keyboard — so nothing is left unverified by
 * invention.
 */

import { formatGap } from "@/model/scale";
import { createArbitrator, readJourney } from "@/input/arbitrator";
import { applyKey } from "@/a11y/keyboard";
import { describeJourney } from "@/a11y/announcer";
import "./style.css";

const app = document.querySelector("#app")!;
const arbitrator = createArbitrator(0.01);

function render(): void {
  const journey = readJourney(arbitrator.gapM);
  const n = Math.round(journey.halvings);

  app.innerHTML = `
    <main class="stage">
      <p class="scale-indicator" aria-live="polite">${formatGap(journey.gapM)}</p>
      <h1 class="milestone">${journey.milestone.label}</h1>
      <p class="blurb">${journey.milestone.blurb}</p>
      <p class="counter" aria-hidden="true">n = ${n}</p>
      <p class="hint">Halve: ↓ / ← · Double: ↑ / → · Reset: R</p>
    </main>
  `;

  // The screen-reader path announces the same journey the sighted one shows.
  document.title = `${formatGap(journey.gapM)} · ${journey.milestone.label}`;
}

window.addEventListener("keydown", (event) => {
  const handled = applyKey(arbitrator, event);
  if (handled) {
    event.preventDefault();
    render();
    const journey = readJourney(arbitrator.gapM);
    console.info(describeJourney(journey));
  }
});

render();
