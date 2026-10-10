/**
 * The degradation ladder — how the experience gives up quality, and in what
 * order, when a device cannot keep up.
 *
 * The rule (finding 4.1): frame rate is sacrificed LAST. A smooth drop in
 * visual richness is recoverable and often unnoticed; a stuttering main loop
 * makes the interaction feel broken, and interaction is the whole product.
 *
 * Each tier removes something measurable, in ascending order of visual cost,
 * and each is applied only when the one before it was not enough. The ladder
 * never climbs back down automatically — recovery would oscillate at the
 * threshold — so the caller bumps the tier explicitly when samples improve.
 */

export const enum QualityTier {
  /** Everything the art direction asks for. */
  Full = 0,
  /** No shadows, fewer lights. The largest single cost removed first. */
  NoShadows = 1,
  /** Coarser geometry and texture detail. */
  ReducedDetail = 2,
  /** Below our rendering floor: the SVG/DOM instrument takes over. */
  Fallback = 3,
}

export const HIGHEST_TIER = QualityTier.Full;
export const LOWEST_TIER = QualityTier.Fallback;

export interface QualitySettings {
  readonly tier: QualityTier;
  /** Device pixel ratio cap. The cheapest real win on high-DPI phones. */
  readonly maxDpr: number;
  readonly shadows: boolean;
  readonly antialias: boolean;
  /** Fraction of the full geometry detail to draw, 0..1. */
  readonly detail: number;
}

/** What the renderer should do at each tier. */
export function settingsFor(tier: QualityTier): QualitySettings {
  switch (tier) {
    case QualityTier.Full:
      return { tier, maxDpr: 2, shadows: true, antialias: true, detail: 1 };
    case QualityTier.NoShadows:
      return { tier, maxDpr: 2, shadows: false, antialias: true, detail: 1 };
    case QualityTier.ReducedDetail:
      return { tier, maxDpr: 1.5, shadows: false, antialias: false, detail: 0.5 };
    case QualityTier.Fallback:
      return { tier, maxDpr: 1, shadows: false, antialias: false, detail: 0.25 };
  }
}

/** Climb one tier harsher. */
export function degrade(from: QualityTier): QualityTier {
  return from < LOWEST_TIER ? (from + 1) as QualityTier : LOWEST_TIER;
}

/**
 * Decide a tier from a window of frame-time samples.
 *
 * @param frameMs recent frame times in milliseconds
 * @param budgetMs the frame budget, default 1000/60
 * @returns the tier that keeps the worst samples inside the budget
 */
export function tierForSamples(
  frameMs: readonly number[],
  budgetMs = 1000 / 60,
): QualityTier {
  if (frameMs.length === 0) return HIGHEST_TIER;
  // Judge by the worst samples, not the mean: a few long frames are what the
  // user feels as a stutter.
  const worst = Math.max(...frameMs);
  if (worst <= budgetMs) return QualityTier.Full;
  if (worst <= budgetMs * 2) return QualityTier.NoShadows;
  if (worst <= budgetMs * 4) return QualityTier.ReducedDetail;
  return QualityTier.Fallback;
}
