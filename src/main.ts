/**
 * Entry point. Minimal for now — the rendering and interaction layers land with
 * tasks E3 and E4. This exists so the toolchain proves out end to end.
 */
import { MILESTONES, formatGap, halvingsFromOrigin } from "@/model/scale";
import "./style.css";

const app = document.querySelector("#app")!;

function render(): void {
  const gap = 5e-4; // fingerprint scale — a placeholder until the input layer lands
  const milestone = MILESTONES.find((m) => m.id === "fingerprint");
  const n = Math.round(halvingsFromOrigin(gap));

  app.innerHTML = `
    <main class="stage">
      <p class="scale-indicator">${formatGap(gap)}</p>
      <h1 class="milestone">${milestone?.label ?? ""}</h1>
      <p class="blurb">${milestone?.blurb ?? ""}</p>
      <p class="counter">n = ${n}</p>
    </main>
  `;
}

render();
