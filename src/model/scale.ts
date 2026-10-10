/**
 * The scale model — the numerical soul of the experience.
 *
 * Design contract (see docs/design.md §7, docs/eng-plan.md):
 *
 *   - `gapWidth` is the ONLY source of truth. Everything else (`n`, the stage,
 *     the display string) is DERIVED from it. No state is allowed to drift.
 *   - Halving is exact: `d_n = d_0 / 2^n`. Divide and multiply by 2 are exact
 *     in float64 for ordinary magnitudes, so `halve ∘ double` is the identity.
 *   - The gap never reaches zero. When the representation runs out of positive
 *     subnormals the model clamps at {@link MIN_GAP_M} and reports the void —
 *     the point of the paradox is that the halving never ends.
 *   - Internal unit is the metre; display units are chosen at the boundary.
 */

/**
 * The initial gap: 10 mm between thumb and index finger.
 * The origin of the journey and the reference point for the halving counter.
 */
export const ORIGIN_GAP_M = 0.01;

/**
 * The floor of the representation: the smallest positive subnormal double
 * (~5e-324 m, far below the Planck length). Halving past this point would
 * underflow to exactly `0`, which the model must never report as a gap width.
 */
export const MIN_GAP_M = Number.MIN_VALUE;

/**
 * The ceiling, set generously above the observable universe (~8.8e26 m) so the
 * upward journey toward cosmic scale has room. Well within float64's exact range.
 */
export const MAX_GAP_M = 1e27;

/** A gap at or below this width is in the void. */
export const VOID_THRESHOLD_M = MIN_GAP_M;

/** The largest gap presented with a named unit; below this, pure scientific notation. */
const SCIENTIFIC_BELOW_M = 1e-3; // 1 mm

/**
 * The number of halvings that separate the origin from `gap`.
 *
 * Continuous and signed: halvings are positive below the origin, negative when
 * the journey doubles upward toward cosmic scale. The counter the user climbs
 * is `Math.round(n)`.
 */
export function halvingsFromOrigin(gapM: number): number {
  return Math.log2(ORIGIN_GAP_M / gapM);
}

/** Halve the gap. Clamps at the representable floor rather than underflowing to 0. */
export function halveGap(gapM: number): number {
  const next = gapM / 2;
  if (!Number.isFinite(next) || next <= 0) return MIN_GAP_M;
  return next;
}

/** Double the gap. Clamps at the ceiling. */
export function doubleGap(gapM: number): number {
  const next = gapM * 2;
  if (!Number.isFinite(next) || next > MAX_GAP_M) return MAX_GAP_M;
  return next;
}

/** Clamp an arbitrary width (e.g. a deep link) into the representable range. */
export function clampGap(gapM: number): number {
  // No NaN propagation at the boundary: an unparseable width falls back to the
  // origin, an overflowing one to the ceiling.
  if (Number.isNaN(gapM)) return ORIGIN_GAP_M;
  if (gapM === Infinity) return MAX_GAP_M;
  if (gapM <= 0) return ORIGIN_GAP_M;
  return Math.min(Math.max(gapM, MIN_GAP_M), MAX_GAP_M);
}

/** True when the gap has reached the floor of the representation. */
export function isVoid(gapM: number): boolean {
  return gapM <= VOID_THRESHOLD_M;
}

/** True when the gap has reached the ceiling of the journey. */
export function isCeiling(gapM: number): boolean {
  return gapM >= MAX_GAP_M;
}

/** A scientific reference point along the journey. Sizes are educational, not boundaries. */
export interface Milestone {
  readonly id: string;
  /** English label; i18n keys replace this when the localization layer lands. */
  readonly label: string;
  /** Characteristic size, in metres. */
  readonly sizeM: number;
  readonly blurb: string;
}

/**
 * The milestones, largest first. Sizes are characteristic reference values
 * drawn from the plan, not hard boundaries — the user explores continuously
 * between them (docs/design.md §7).
 */
export const MILESTONES: readonly Milestone[] = [
  {
    id: "cosmos",
    label: "Cosmos",
    sizeM: 1e26,
    blurb: "The scale of galaxies and the observable universe.",
  },
  {
    id: "earth",
    label: "Earth",
    sizeM: 6.4e6,
    blurb: "A planet, measured across.",
  },
  {
    id: "room",
    label: "Room",
    sizeM: 3,
    blurb: "The distance across an ordinary room.",
  },
  {
    id: "hand",
    label: "Hand",
    sizeM: 0.01,
    blurb: "The gap between your thumb and index finger, about ten millimetres.",
  },
  {
    id: "fingerprint",
    label: "Fingerprint",
    sizeM: 5e-4, // 0.5 mm — characteristic ridge spacing
    blurb: "The ridges of a fingerprint. Reference spacing, not your own hand's.",
  },
  {
    id: "cell",
    label: "Cell",
    sizeM: 5e-6, // 5 µm
    blurb: "A living cell. Sizes vary a great deal between cell types.",
  },
  {
    id: "molecule",
    label: "Molecule",
    sizeM: 3e-10, // 0.3 nm
    blurb: "A small molecule. Molecules differ greatly in size and structure.",
  },
  {
    id: "atom",
    label: "Atom",
    sizeM: 5.3e-11, // 53 pm — the Bohr radius
    blurb: "An atom. The Bohr radius, the edge of the electron cloud.",
  },
];

/**
 * The milestone nearest to `gapM` on a logarithmic scale.
 *
 * This drives the scale indicator: as the gap narrows, the label steps from
 * hand to fingerprint to cell and onward. It is a guide, never a clamp.
 */
export function nearestMilestone(gapM: number): Milestone {
  const log = Math.log10(gapM);
  const dist = (m: Milestone): number => Math.abs(Math.log10(m.sizeM) - log);
  // MILESTONES is non-empty; reduce over it picks the closest by log distance.
  return MILESTONES.reduce((best, m) => (dist(m) < dist(best) ? m : best));
}

/**
 * Present a gap width for the user.
 *
 * At and above a millimetre the width gets a named, locale-aware unit.
 * Below it, the width is pure scientific notation — clearer than stacking
 * unfamiliar unit prefixes across eight orders of magnitude.
 *
 * The result is never `NaN` and never `0`: a nonzero gap always reads as a
 * positive width, and the floor reads as the void.
 */
export function formatGap(gapM: number, locale = "en"): string {
  if (!Number.isFinite(gapM) || gapM <= 0) return formatVoid(locale);

  if (gapM >= SCIENTIFIC_BELOW_M) {
    const { value, unit } = namedUnit(gapM);
    return new Intl.NumberFormat(locale, {
      style: "unit",
      unit,
      unitDisplay: "short",
      maximumSignificantDigits: 3,
    }).format(value);
  }

  return new Intl.NumberFormat(locale, {
    notation: "scientific",
    maximumFractionDigits: 2,
  }).format(gapM);
}

/** The void's own label: the gap is still there, but the number has run out. */
export function formatVoid(locale = "en"): string {
  return new Intl.NumberFormat(locale, {
    notation: "scientific",
    maximumFractionDigits: 2,
  }).format(MIN_GAP_M);
}

interface NamedUnit {
  readonly value: number;
  readonly unit: string;
}

function namedUnit(gapM: number): NamedUnit {
  if (gapM >= 1000) return { value: gapM / 1000, unit: "kilometer" };
  if (gapM >= 1) return { value: gapM, unit: "meter" };
  return { value: gapM * 1000, unit: "millimeter" };
}

/**
 * Describe a mathematical operation for the user, e.g. `10 mm → 5 mm`.
 *
 * The display is feedback only — it never determines the result.
 */
export function formatOperation(
  fromM: number,
  toM: number,
  locale = "en",
): string {
  return `${formatGap(fromM, locale)} → ${formatGap(toM, locale)}`;
}
