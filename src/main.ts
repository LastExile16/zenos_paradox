/**
 * Entry point.
 *
 * Drives the real scene: the arbitrator holds the gap, the keyboard and the
 * buttons write through the same path, and the scene chases the model value
 * every frame. The model owns the mathematics; nothing here may change it
 * except through the arbitrator.
 */

import { formatGap } from "@/model/scale";
import { createArbitrator, readJourney } from "@/input/arbitrator";
import { applyKey } from "@/a11y/keyboard";
import { createScene } from "@/render/scene";
import { createHandStage } from "@/stages/stage1-hand";
import { createFingerprintStage } from "@/stages/stage2-fingerprint";
import "./style.css";

const container = document.querySelector<HTMLElement>("#scene")!;
const arbitrator = createArbitrator(0.01);
const journey = {
  stages: [createHandStage(), createFingerprintStage()],
};
const scene = createScene(container, journey, arbitrator.gapM);

const indicator = document.querySelector<HTMLElement>("#scale-indicator")!;
const milestone = document.querySelector<HTMLElement>("#milestone")!;
const counter = document.querySelector<HTMLElement>("#counter")!;

function updateHud(): void {
  const state = readJourney(arbitrator.gapM);
  indicator.textContent = formatGap(state.gapM);
  milestone.textContent = state.milestone.label;
  counter.textContent = `n = ${Math.round(state.halvings)}`;
  document.title = `${formatGap(state.gapM)} · ${state.milestone.label}`;
}

function onHalve(): void {
  arbitrator.halve();
  updateHud();
}

function onDouble(): void {
  arbitrator.double();
  updateHud();
}

function onReset(): void {
  arbitrator.reset();
  updateHud();
}

document.querySelector<HTMLButtonElement>("#halve")!.addEventListener("click", onHalve);
document.querySelector<HTMLButtonElement>("#double")!.addEventListener("click", onDouble);
document.querySelector<HTMLButtonElement>("#reset")!.addEventListener("click", onReset);

window.addEventListener("keydown", (event) => {
  if (applyKey(arbitrator, event)) {
    event.preventDefault();
    updateHud();
  }
});

updateHud();

let last = performance.now();
function loop(now: number): void {
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;
  scene.tick(arbitrator.gapM, dt);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
