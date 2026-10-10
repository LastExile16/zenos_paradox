import { describe, expect, it } from "vitest";
import { FINGERPRINT_HOME_GAP_M, createFingerprintStage } from "@/stages/stage2-fingerprint";
import { HAND_HOME_GAP_M, createHandStage } from "@/stages/stage1-hand";
import {
  type Journey,
  blendStages,
  currentStage,
  isWithinStage,
} from "@/transition";

function journey(): Journey {
  return { stages: [createHandStage(), createFingerprintStage()] };
}

describe("blendStages", () => {
  it("shows only the hand at the hand's home gap", () => {
    const blends = blendStages(journey(), HAND_HOME_GAP_M);
    expect(blends).toHaveLength(1);
    expect(blends[0]!.stage.id).toBe("hand");
    expect(blends[0]!.weight).toBeCloseTo(1, 6);
  });

  it("shows only the fingerprint at its home gap", () => {
    const blends = blendStages(journey(), FINGERPRINT_HOME_GAP_M);
    expect(blends).toHaveLength(1);
    expect(blends[0]!.stage.id).toBe("fingerprint");
  });

  it("cross-fades between the two stages between their home gaps", () => {
    const mid = Math.sqrt(HAND_HOME_GAP_M * FINGERPRINT_HOME_GAP_M);
    const blends = blendStages(journey(), mid);
    expect(blends.map((b) => b.stage.id).sort()).toEqual(["fingerprint", "hand"]);
    for (const b of blends) expect(b.weight).toBeGreaterThan(0);
    expect(blends.reduce((s, b) => s + b.weight, 0)).toBeCloseTo(1, 6);
  });

  it("keeps total weight at 1 across the journey", () => {
    for (let g = 0.01; g > 1e-6; g *= 0.7) {
      const total = blendStages(journey(), g).reduce((s, b) => s + b.weight, 0);
      expect(total).toBeCloseTo(1, 6);
    }
  });

  it("holds the nearest stage open past every stage's decade", () => {
    // The journey is built out incrementally; gaps between implemented stages
    // must still draw something rather than fading the scene to nothing.
    const blends = blendStages(journey(), 1e-5);
    expect(blends).toHaveLength(1);
    expect(blends[0]!.stage.id).toBe("fingerprint");
    expect(blends[0]!.weight).toBe(1);
  });

  it("drops a stage once it is more than a decade away", () => {
    const far = blendStages(journey(), 0.01 * 0.099); // just under one decade down
    expect(far.map((b) => b.stage.id)).not.toContain("hand");
  });
});

describe("currentStage", () => {
  it("picks the nearest stage, not the loudest in the blend", () => {
    expect(currentStage(journey(), HAND_HOME_GAP_M).id).toBe("hand");
    expect(currentStage(journey(), FINGERPRINT_HOME_GAP_M).id).toBe("fingerprint");
  });

  it("switches at the geometric midpoint", () => {
    const mid = Math.sqrt(HAND_HOME_GAP_M * FINGERPRINT_HOME_GAP_M);
    expect(currentStage(journey(), mid * 1.01).id).toBe("hand");
    expect(currentStage(journey(), mid * 0.99).id).toBe("fingerprint");
  });
});

describe("isWithinStage", () => {
  it("is true within half a decade of home", () => {
    expect(isWithinStage(createHandStage(), HAND_HOME_GAP_M)).toBe(true);
    expect(isWithinStage(createHandStage(), HAND_HOME_GAP_M * 2)).toBe(true);
    expect(isWithinStage(createHandStage(), HAND_HOME_GAP_M / 3)).toBe(true);
  });

  it("is false past half a decade", () => {
    expect(isWithinStage(createHandStage(), HAND_HOME_GAP_M / 4)).toBe(false);
    expect(isWithinStage(createHandStage(), HAND_HOME_GAP_M / 10)).toBe(false);
  });
});
