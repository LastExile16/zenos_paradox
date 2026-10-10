import { describe, expect, it } from "vitest";
import {
  HIGHEST_TIER,
  LOWEST_TIER,
  QualityTier,
  degrade,
  settingsFor,
  tierForSamples,
} from "@/perf/quality";

describe("quality ladder", () => {
  it("orders the tiers from full to fallback", () => {
    expect(HIGHEST_TIER).toBe(QualityTier.Full);
    expect(LOWEST_TIER).toBe(QualityTier.Fallback);
    expect(QualityTier.Full).toBeLessThan(QualityTier.NoShadows);
    expect(QualityTier.NoShadows).toBeLessThan(QualityTier.ReducedDetail);
    expect(QualityTier.ReducedDetail).toBeLessThan(QualityTier.Fallback);
  });

  it("removes the most expensive things first", () => {
    expect(settingsFor(QualityTier.Full).shadows).toBe(true);
    expect(settingsFor(QualityTier.NoShadows).shadows).toBe(false);
    // Shadows are gone before detail is touched.
    expect(settingsFor(QualityTier.NoShadows).detail).toBe(1);
    expect(settingsFor(QualityTier.ReducedDetail).detail).toBeLessThan(1);
  });

  it("caps the DPR as the cheapest real win", () => {
    expect(settingsFor(QualityTier.Full).maxDpr).toBeGreaterThan(1);
    expect(settingsFor(QualityTier.Fallback).maxDpr).toBe(1);
  });

  it("every tier has valid, finite settings", () => {
    for (let t = HIGHEST_TIER; t <= LOWEST_TIER; t++) {
      const s = settingsFor(t as QualityTier);
      expect(s.maxDpr).toBeGreaterThan(0);
      expect(s.detail).toBeGreaterThan(0);
      expect(s.detail).toBeLessThanOrEqual(1);
    }
  });

  it("degrades one tier at a time and stops at the floor", () => {
    expect(degrade(QualityTier.Full)).toBe(QualityTier.NoShadows);
    expect(degrade(QualityTier.ReducedDetail)).toBe(QualityTier.Fallback);
    expect(degrade(QualityTier.Fallback)).toBe(QualityTier.Fallback);
  });
});

describe("frame sample assessment", () => {
  const budget = 1000 / 60;

  it("keeps full quality when every frame makes budget", () => {
    expect(tierForSamples([budget * 0.5, budget * 0.9], budget)).toBe(
      QualityTier.Full,
    );
  });

  it("judges by the worst sample, not the mean", () => {
    // A mean inside budget with one long frame must still degrade.
    const samples = [budget * 0.5, budget * 0.5, budget * 3];
    expect(tierForSamples(samples, budget)).not.toBe(QualityTier.Full);
  });

  it("never degrades past the measured cost", () => {
    expect(tierForSamples([budget * 1.5], budget)).toBe(QualityTier.NoShadows);
    expect(tierForSamples([budget * 3], budget)).toBe(QualityTier.ReducedDetail);
    expect(tierForSamples([budget * 10], budget)).toBe(QualityTier.Fallback);
  });

  it("assumes the best when given no samples", () => {
    expect(tierForSamples([], budget)).toBe(QualityTier.Full);
  });
});
