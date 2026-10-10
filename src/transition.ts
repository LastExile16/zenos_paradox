/**
 * Stage transitions — how the journey moves between representations.
 *
 * The user travels continuously, but stages are discrete representations, so
 * the hand must dissolve into the fingerprint without a jump. The composition
 * invariant (wall-contract.ts) is what makes this safe: both stages put their
 * walls at x = ±gap/2 at any width, so a cross-fade between them switches
 * content without moving the frame.
 *
 * Blend weights come from log distance along the journey, so stages fade in
 * smoothly as the user approaches and out as they pass — never a hard cut.
 */

import type { WallContract } from "@/render/wall-contract";

/** A stage paired with how strongly it should currently be shown. */
export interface StageBlend {
  readonly stage: WallContract;
  /** 0..1; the renderer multiplies opacity by this. */
  readonly weight: number;
}

/** The stages along the journey, ordered from the widest gap to the narrowest. */
export interface Journey {
  readonly stages: readonly WallContract[];
}

/**
 * Blend every stage for `gapM`.
 *
 * Each stage's weight falls off with log distance from its home gap, giving a
 * soft cross-fade centred on each stage. Only stages within one decade carry
 * any weight, so at most a few are ever visible.
 */
export function blendStages(journey: Journey, gapM: number): StageBlend[] {
  const log = Math.log10(gapM);
  const blends: StageBlend[] = [];
  let total = 0;

  for (const stage of journey.stages) {
    const distance = Math.abs(Math.log10(stage.homeGapM) - log);
    // A triangular kernel one decade wide: full weight at home, zero past it.
    const weight = Math.max(0, 1 - distance);
    if (weight > 0) {
      blends.push({ stage, weight });
      total += weight;
    }
  }

  // The renderer always needs something to draw. Outside every stage's decade —
  // which happens between implemented stages, since the journey is built out
  // incrementally — hold the nearest stage at full weight rather than fading
  // the scene to nothing.
  if (total === 0) return [{ stage: currentStage(journey, gapM), weight: 1 }];

  // Normalise so the visible stages sum to 1, keeping the scene's overall
  // brightness constant through a cross-fade.
  return blends.map((b) => ({ ...b, weight: b.weight / total }));
}

/**
 * The stage the user is closest to. Drives the milestone label and the
 * scale indicator; blending does not affect it.
 */
export function currentStage(journey: Journey, gapM: number): WallContract {
  const log = Math.log10(gapM);
  const dist = (s: WallContract): number =>
    Math.abs(Math.log10(s.homeGapM) - log);
  // The journey always has at least one stage; reduce over it picks the nearest.
  return journey.stages.reduce((best, s) => (dist(s) < dist(best) ? s : best));
}

/** Whether the journey has crossed from the hand into the fingerprint. */
export function isWithinStage(stage: WallContract, gapM: number): boolean {
  return Math.abs(Math.log10(stage.homeGapM) - Math.log10(gapM)) < 0.5;
}
