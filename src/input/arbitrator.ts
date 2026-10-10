/**
 * The input arbitrator — the single write path to the scale model.
 *
 * Every input — pinch, slider, Halve, Double, keyboard, deep link, reset —
 * funnels through here. Nothing else may touch the gap. This is what makes
 * "all controls operate on the same underlying state" (docs/design.md §5) a
 * compile-time guarantee rather than a convention.
 *
 * Each change records where it came from. The source matters: user input
 * overrides an in-flight deep link, and the HUD shows which path is live.
 */

import {
  type Milestone,
  clampGap,
  doubleGap,
  halveGap,
  halvingsFromOrigin,
  isCeiling,
  isVoid,
  nearestMilestone,
} from "@/model/scale";

/** The input paths that can move the gap. */
export type InputSource =
  | "pinch"
  | "slider"
  | "halve"
  | "double"
  | "keyboard"
  | "reset"
  | "deeplink";

export interface GapChange {
  readonly source: InputSource;
  readonly from: number;
  readonly to: number;
}

export interface Arbitrator {
  /** Move to an arbitrary width, clamped to the representable range. */
  set(source: InputSource, gapM: number): GapChange;
  /** Halve the gap. */
  halve(source?: InputSource): GapChange;
  /** Double the gap. */
  double(source?: InputSource): GapChange;
  /** Return to the origin. */
  reset(): GapChange;
  /** The current width, in metres. */
  readonly gapM: number;
  /** Whether the last change came from the user rather than a deep link. */
  readonly lastSource: InputSource | undefined;
}

export function createArbitrator(initialGapM: number): Arbitrator {
  let gap = clampGap(initialGapM);
  let lastSource: InputSource | undefined;

  function apply(source: InputSource, next: number): GapChange {
    const change: GapChange = { source, from: gap, to: next };
    gap = next;
    lastSource = source;
    return change;
  }

  return {
    set(source, gapM) {
      return apply(source, clampGap(gapM));
    },
    halve(source = "halve") {
      return apply(source, halveGap(gap));
    },
    double(source = "double") {
      return apply(source, doubleGap(gap));
    },
    reset() {
      return apply("reset", 0.01);
    },
    get gapM() {
      return gap;
    },
    get lastSource() {
      return lastSource;
    },
  };
}

/** The whole read model, derived from the gap in one place. */
export interface JourneyState {
  readonly gapM: number;
  readonly halvings: number;
  readonly milestone: Milestone;
  readonly void: boolean;
  readonly ceiling: boolean;
}

export function readJourney(gapM: number): JourneyState {
  return {
    gapM,
    halvings: halvingsFromOrigin(gapM),
    milestone: nearestMilestone(gapM),
    void: isVoid(gapM),
    ceiling: isCeiling(gapM),
  };
}
