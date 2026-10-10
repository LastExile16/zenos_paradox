import { describe, expect, it } from "vitest";
import {
  MILESTONES,
  MIN_GAP_M,
  ORIGIN_GAP_M,
} from "@/model/scale";
import { type JourneyState, createArbitrator } from "@/input/arbitrator";
import { applyKey, DEFAULT_BINDINGS } from "@/a11y/keyboard";
import {
  announceChange,
  describeJourney,
} from "@/a11y/announcer";

function at(gapM: number): JourneyState {
  return {
    gapM,
    halvings: Math.log2(ORIGIN_GAP_M / gapM),
    milestone: MILESTONES.reduce((best, m) =>
      Math.abs(Math.log10(m.sizeM) - Math.log10(gapM)) <
      Math.abs(Math.log10(best.sizeM) - Math.log10(gapM))
        ? m
        : best,
    ),
    void: gapM <= MIN_GAP_M,
    ceiling: gapM >= 1e27,
  };
}

describe("keyboard", () => {
  it("halves on the down and left arrows", () => {
    for (const code of DEFAULT_BINDINGS.halve) {
      const sut = createArbitrator(ORIGIN_GAP_M);
      const event = { code } as KeyboardEvent;
      expect(applyKey(sut, event)).toBe("keyboard");
      expect(sut.gapM).toBe(5e-3);
    }
  });

  it("doubles on the up and right arrows", () => {
    for (const code of DEFAULT_BINDINGS.double) {
      const sut = createArbitrator(ORIGIN_GAP_M);
      expect(applyKey(sut, { code } as KeyboardEvent)).toBe("keyboard");
      expect(sut.gapM).toBe(2e-2);
    }
  });

  it("resets on KeyR", () => {
    const sut = createArbitrator(ORIGIN_GAP_M);
    sut.halve();
    expect(applyKey(sut, { code: "KeyR" } as KeyboardEvent)).toBe("reset");
    expect(sut.gapM).toBe(ORIGIN_GAP_M);
  });

  it("ignores unbound keys without touching the model", () => {
    const sut = createArbitrator(ORIGIN_GAP_M);
    expect(applyKey(sut, { code: "KeyQ" } as KeyboardEvent)).toBeUndefined();
    expect(sut.gapM).toBe(ORIGIN_GAP_M);
  });

  it("writes through the same arbitrator as every other input", () => {
    const sut = createArbitrator(ORIGIN_GAP_M);
    applyKey(sut, { code: "ArrowDown" } as KeyboardEvent);
    expect(sut.lastSource).toBe("keyboard");
  });
});

describe("announcer", () => {
  it("orients the user on the first announcement", () => {
    const announcement = announceChange(undefined, at(ORIGIN_GAP_M));
    expect(announcement?.interrupt).toBe(true);
    expect(announcement?.text).toContain("10 mm");
    expect(announcement?.text).toContain("Hand");
  });

  it("interrupts when the milestone changes", () => {
    const announcement = announceChange(at(ORIGIN_GAP_M), at(5e-4));
    expect(announcement?.interrupt).toBe(true);
    expect(announcement?.text).toContain("Fingerprint");
  });

  it("reports a crossed order of magnitude without interrupting", () => {
    const announcement = announceChange(at(1e-3), at(5e-4));
    expect(announcement?.interrupt).toBe(false);
    // 5e-4 m is below the 1 mm threshold, so the model uses scientific notation.
    expect(announcement?.text).toContain("5E-4");
  });

  it("stays silent within a decade, so a pinch is not a torrent of numbers", () => {
    expect(announceChange(at(5e-4), at(4.5e-4))).toBeUndefined();
  });

  it("describes the void without ever calling it zero", () => {
    const text = describeJourney(at(MIN_GAP_M));
    expect(text).not.toMatch(/\bzero mm\b/i);
    expect(text).toContain("never will be");
  });

  it("never includes NaN or an empty width", () => {
    for (const gap of [ORIGIN_GAP_M, 5e-4, MIN_GAP_M]) {
      const text = describeJourney(at(gap));
      expect(text).not.toContain("NaN");
      expect(text.length).toBeGreaterThan(0);
    }
  });
});
