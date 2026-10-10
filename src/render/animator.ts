/**
 * The animator — smooth, retargetable interpolation toward the model value.
 *
 * The model owns the mathematics; the animator only chases it. When the user
 * moves mid-transition, the target simply changes and the interpolator bends
 * toward the new value (finding 4A-i: mid-transition input retargets the
 * in-flight animation rather than cancelling or queueing it).
 *
 * Exponential approach rather than a fixed-duration tween: it is frame-rate
 * independent, never overshoots, and needs no duration bookkeeping to
 * retarget. The perceived cost is that arrival is asymptotic, so a small
 * epsilon snaps to the target and reports completion.
 */

/** Time constant: the gap closes ~95% of the way in 3 * TAU seconds. */
export const GAP_TAU = 0.22;

/** One part per million — far below anything visible at any scale. */
export const SETTLE_RELATIVE = 1e-6;

/**
 * The tolerance below which the display counts as arrived.
 *
 * Relative, because the gap spans 300 orders of magnitude: an absolute epsilon
 * is meaningless at the atom stage (53 pm), where a nanometre tolerance would
 * be larger than the target and the animator would snap instead of moving.
 *
 * Floored at a few subnormals, because when the target itself is subnormal any
 * relative multiple of it underflows to zero and the animator would stall a
 * ULP or two short forever. Nothing resolves finer than the representation.
 */
export function settleTolerance(target: number): number {
  return Math.max(Math.abs(target) * SETTLE_RELATIVE, 4 * Number.MIN_VALUE);
}

export interface AnimatorState {
  /** The width currently on screen. The renderer reads this every frame. */
  display: number;
  /** The width the model says we are heading for. */
  target: number;
}

/**
 * Advance one frame of exponential approach.
 *
 * @returns the new display value.
 */
export function approach(
  current: number,
  target: number,
  dt: number,
  tau = GAP_TAU,
): number {
  if (dt <= 0) return current;
  if (current === target) return target;
  const alpha = 1 - Math.exp(-dt / tau);
  const next = current + (target - current) * alpha;
  if (Math.abs(target - next) <= settleTolerance(target)) return target;
  // The step rounded away to nothing: the remaining distance is finer than the
  // representation can express, so iteration has converged as far as float64
  // permits. Snap to the model's value rather than stranding the display a few
  // ULPs away for the rest of the session.
  if (next === current) return target;
  return next;
}

/** True once the display has settled on the target. */
export function isSettled(display: number, target: number): boolean {
  return Math.abs(display - target) <= settleTolerance(target);
}

/**
 * The orders of magnitude crossed while travelling from `from` to `to`.
 *
 * Haptic ticks are keyed to crossed decades rather than to taps, so the user
 * feels the journey's rhythm regardless of which input drove it.
 */
export function crossedDecades(from: number, to: number): number {
  if (from <= 0 || to <= 0) return 0;
  return Math.floor(Math.log10(from)) - Math.floor(Math.log10(to));
}
