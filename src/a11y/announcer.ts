/**
 * The announcer — a screen-reader live region fed by the same model.
 *
 * Screen-reader users get the journey as text, not as a substitute for it:
 * the announcement names the gap, the halving count, and the milestone, and
 * it speaks a transition only when the change is worth announcing.
 *
 * Announcements are throttled by *meaning*, not by time. A continuous pinch
 * fires hundreds of model changes a second; announcing each would bury the
 * user in numbers. Instead the announcer speaks when the milestone changes
 * or the user crosses an order of magnitude, and it always reports the
 * settled value on request.
 */

import { type JourneyState } from "@/input/arbitrator";
import { formatGap } from "@/model/scale";

export interface Announcement {
  /** The text spoken, and shown in any captions UI. */
  readonly text: string;
  /** Whether this should interrupt anything currently being spoken. */
  readonly interrupt: boolean;
}

/**
 * Decides what to announce for a journey change.
 *
 * Returns `undefined` when nothing is worth saying — the common case during a
 * continuous gesture. Callers must not treat that as an error.
 */
export function announceChange(
  previous: JourneyState | undefined,
  current: JourneyState,
  locale = "en",
): Announcement | undefined {
  const text = describeJourney(current, locale);

  // First announcement of the session: orient the user.
  if (!previous) return { text, interrupt: true };

  // A new scientific milestone is always worth interrupting for.
  if (current.milestone.id !== previous.milestone.id) {
    return { text, interrupt: true };
  }

  // An order of magnitude crossed within a milestone: report the new width,
  // but without cutting off the previous announcement.
  const crossed = Math.floor(Math.log10(previous.gapM)) - Math.floor(Math.log10(current.gapM));
  if (crossed !== 0) {
    return {
      text: `${formatGap(current.gapM, locale)}${current.void ? ", the void" : ""}`,
      interrupt: false,
    };
  }

  return undefined;
}

/** A full description of the journey, suitable for the initial orientation. */
export function describeJourney(state: JourneyState, locale = "en"): string {
  const width = formatGap(state.gapM, locale);
  const halvings = Math.round(state.halvings);

  if (state.void) {
    return `${width}. ${halvings} halvings. The gap is still not zero, and never will be.`;
  }

  return `${width} between the surfaces. ${state.milestone.label}. ${halvings} halvings.`;
}
