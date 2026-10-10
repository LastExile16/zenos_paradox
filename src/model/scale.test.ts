import { describe, expect, it } from "vitest";
import {
  MILESTONES,
  MIN_GAP_M,
  ORIGIN_GAP_M,
  clampGap,
  doubleGap,
  formatGap,
  formatOperation,
  formatVoid,
  halveGap,
  halvingsFromOrigin,
  isCeiling,
  isVoid,
  nearestMilestone,
} from "./scale";

describe("halve / double identity", () => {
  it("round-trips an ordinary gap", () => {
    for (const gap of [ORIGIN_GAP_M, 5e-3, 1e-6, 5.3e-11]) {
      expect(doubleGap(halveGap(gap))).toBe(gap);
    }
  });

  it("never produces zero, NaN, or infinity, however far it is pushed", () => {
    let gap = ORIGIN_GAP_M;
    for (let i = 0; i < 4000; i++) gap = halveGap(gap);
    expect(gap).toBeGreaterThan(0);
    expect(Number.isFinite(gap)).toBe(true);
    expect(isVoid(gap)).toBe(true);
  });

  it("never exceeds the ceiling, however far it is pushed", () => {
    let gap = ORIGIN_GAP_M;
    for (let i = 0; i < 4000; i++) gap = doubleGap(gap);
    expect(Number.isFinite(gap)).toBe(true);
    expect(isCeiling(gap)).toBe(true);
  });
});

describe("d_n = d_0 / 2^n", () => {
  it("matches the closed form for the first 60 halvings", () => {
    let gap = ORIGIN_GAP_M;
    for (let n = 0; n < 60; n++) {
      expect(gap).toBe(ORIGIN_GAP_M / 2 ** n);
      gap = halveGap(gap);
    }
  });

  it("derives the halving counter from the gap width", () => {
    expect(halvingsFromOrigin(ORIGIN_GAP_M)).toBeCloseTo(0, 10);
    expect(halvingsFromOrigin(ORIGIN_GAP_M / 2)).toBeCloseTo(1, 10);
    expect(halvingsFromOrigin(ORIGIN_GAP_M / 1024)).toBeCloseTo(10, 10);
    // Doubling upward gives a negative count: the dichotomy runs both ways.
    expect(halvingsFromOrigin(ORIGIN_GAP_M * 2)).toBeCloseTo(-1, 10);
  });
});

describe("never-zero contract", () => {
  it("clamps the floor instead of underflowing", () => {
    let gap = ORIGIN_GAP_M;
    for (let i = 0; i < 4000; i++) gap = halveGap(gap);
    expect(gap).toBe(MIN_GAP_M);
    expect(halveGap(gap)).toBe(MIN_GAP_M);
  });

  it("never formats a nonzero gap as 0 or NaN", () => {
    let gap = ORIGIN_GAP_M;
    for (let i = 0; i < 4000; i++) {
      const text = formatGap(gap);
      expect(text).not.toMatch(/^0(\.0+)?$/);
      expect(text).not.toContain("NaN");
      expect(text.length).toBeGreaterThan(0);
      gap = halveGap(gap);
    }
  });

  it("reports the void as the smallest positive width, not zero", () => {
    const text = formatVoid();
    expect(text).toBe("5E-324"); // Number.MIN_VALUE, rounded to one digit by ICU
    expect(Number.parseFloat(text)).toBeGreaterThan(0);
  });
});

describe("clamping", () => {
  it("rejects non-finite and non-positive input", () => {
    expect(clampGap(NaN)).toBe(ORIGIN_GAP_M);
    expect(clampGap(0)).toBe(ORIGIN_GAP_M);
    expect(clampGap(-1)).toBe(ORIGIN_GAP_M);
    expect(clampGap(Infinity)).toBe(1e27);
  });

  it("respects the representable range", () => {
    // Number.MIN_VALUE is the smallest positive double, so halving it
    // underflows to 0 and routes through the non-positive branch instead.
    expect(clampGap(MIN_GAP_M)).toBe(MIN_GAP_M);
    expect(clampGap(1e30)).toBe(1e27);
  });
});

describe("formatting", () => {
  it("uses named units at human scale", () => {
    expect(formatGap(0.01)).toBe("10 mm");
    expect(formatGap(0.005)).toBe("5 mm");
    expect(formatGap(1)).toBe("1 m");
    expect(formatGap(2000)).toBe("2 km");
  });

  it("switches to scientific notation below a millimetre", () => {
    expect(formatGap(5e-4)).toBe("5E-4");
    expect(formatGap(5.3e-11)).toBe("5.3E-11");
  });

  it("is locale-aware", () => {
    // German uses a comma decimal separator.
    expect(formatGap(0.005, "de")).toBe("5 mm");
    expect(formatGap(5.5e-4, "de")).toBe("5,5E-4");
  });

  it("describes operations", () => {
    expect(formatOperation(0.01, 0.005)).toBe("10 mm → 5 mm");
  });
});

describe("milestones", () => {
  it("anchors the journey at characteristic sizes", () => {
    expect(nearestMilestone(0.01).id).toBe("hand");
    expect(nearestMilestone(5e-4).id).toBe("fingerprint");
    expect(nearestMilestone(5e-6).id).toBe("cell");
    expect(nearestMilestone(3e-10).id).toBe("molecule");
    expect(nearestMilestone(5.3e-11).id).toBe("atom");
  });

  it("is ordered largest-first", () => {
    for (let i = 1; i < MILESTONES.length; i++) {
      expect(MILESTONES[i]!.sizeM).toBeLessThan(MILESTONES[i - 1]!.sizeM);
    }
  });

  it("never returns an undefined label", () => {
    for (const m of MILESTONES) {
      expect(m.label.length).toBeGreaterThan(0);
      expect(m.blurb.length).toBeGreaterThan(0);
    }
  });
});
