/**
 * Keyboard control — a first-class input path, not a fallback.
 *
 * The keyboard drives the same arbitrator the pinch and slider do, so a
 * keyboard user takes the identical journey. Keys are named, not re-derived
 * at each call site, so the mapping has one place to change.
 *
 * Halve and double on the arrow keys rather than on H/D, because the arrows
 * carry the directional semantics the journey already uses: narrower is
 * downward into the small, wider is upward toward the hand.
 */

import type { Arbitrator, InputSource } from "@/input/arbitrator";

export interface KeyboardBindings {
  /** Halve the gap, stepping down into the small. */
  readonly halve: readonly string[];
  /** Double the gap, stepping back up toward the hand. */
  readonly double: readonly string[];
  /** Return to the origin. */
  readonly reset: readonly string[];
}

export const DEFAULT_BINDINGS: KeyboardBindings = {
  halve: ["ArrowDown", "ArrowLeft"],
  double: ["ArrowUp", "ArrowRight"],
  reset: ["KeyR"],
} as const;

/**
 * Apply a keyboard event to the journey.
 *
 * @returns the change the key produced, or `undefined` if the key is unbound.
 * Callers decide whether to preventDefault; the camera-traversing arrows
 * should never also scroll the page.
 */
export function applyKey(
  arbitrator: Arbitrator,
  event: KeyboardEvent,
  bindings: KeyboardBindings = DEFAULT_BINDINGS,
): InputSource | undefined {
  const code = event.code;
  if (bindings.halve.includes(code)) {
    arbitrator.halve("keyboard");
    return "keyboard";
  }
  if (bindings.double.includes(code)) {
    arbitrator.double("keyboard");
    return "keyboard";
  }
  if (bindings.reset.includes(code)) {
    arbitrator.reset();
    return "reset";
  }
  return undefined;
}
