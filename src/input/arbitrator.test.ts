import { describe, expect, it } from "vitest";
import { MILESTONES, MIN_GAP_M, ORIGIN_GAP_M } from "@/model/scale";
import {
  type InputSource,
  createArbitrator,
  readJourney,
} from "@/input/arbitrator";

const SOURCES: InputSource[] = [
  "pinch",
  "slider",
  "halve",
  "double",
  "keyboard",
  "reset",
  "deeplink",
];

describe("single write path", () => {
  it("every source writes the same model", () => {
    for (const source of SOURCES) {
      const sut = createArbitrator(ORIGIN_GAP_M);
      const change = sut.set(source, 5e-3);
      expect(change.to).toBe(5e-3);
      expect(sut.gapM).toBe(5e-3);
    }
  });

  it("records the source of each change", () => {
    const sut = createArbitrator(ORIGIN_GAP_M);
    expect(sut.lastSource).toBeUndefined();
    sut.set("slider", 5e-3);
    expect(sut.lastSource).toBe("slider");
    sut.set("pinch", 2.5e-3);
    expect(sut.lastSource).toBe("pinch");
  });

  it("clamps whatever a source supplies, including deep links", () => {
    const sut = createArbitrator(ORIGIN_GAP_M);
    expect(sut.set("deeplink", NaN).to).toBe(ORIGIN_GAP_M);
    expect(sut.set("deeplink", -1).to).toBe(ORIGIN_GAP_M);
    expect(sut.set("deeplink", MIN_GAP_M).to).toBe(MIN_GAP_M);
  });
});

describe("halve and double", () => {
  it("halve divides by two exactly", () => {
    const sut = createArbitrator(ORIGIN_GAP_M);
    expect(sut.halve().to).toBe(5e-3);
    expect(sut.halve().to).toBe(2.5e-3);
  });

  it("double multiplies by two exactly", () => {
    const sut = createArbitrator(ORIGIN_GAP_M);
    expect(sut.double().to).toBe(2e-2);
    expect(sut.double().to).toBe(4e-2);
  });

  it("round-trips through the model", () => {
    const sut = createArbitrator(3.7e-6);
    const start = sut.gapM;
    sut.double();
    sut.halve();
    expect(sut.gapM).toBe(start);
  });

  it("never underflows to zero", () => {
    const sut = createArbitrator(ORIGIN_GAP_M);
    for (let i = 0; i < 4000; i++) sut.halve();
    expect(sut.gapM).toBe(MIN_GAP_M);
  });

  it("reports the transition for feedback, e.g. 10 mm -> 5 mm", () => {
    const sut = createArbitrator(ORIGIN_GAP_M);
    expect(sut.halve()).toMatchObject({ from: ORIGIN_GAP_M, to: 5e-3 });
  });
});

describe("reset", () => {
  it("returns to the origin without losing the journey first", () => {
    const sut = createArbitrator(ORIGIN_GAP_M);
    sut.halve();
    sut.halve();
    expect(sut.reset()).toMatchObject({ source: "reset", to: ORIGIN_GAP_M });
  });
});

describe("read model", () => {
  it("derives the halving counter and milestone from the gap", () => {
    const journey = readJourney(ORIGIN_GAP_M);
    expect(journey.halvings).toBeCloseTo(0, 10);
    expect(journey.milestone.id).toBe("hand");
    expect(journey.void).toBe(false);
    expect(journey.ceiling).toBe(false);
  });

  it("reaches the void at the floor", () => {
    expect(readJourney(MIN_GAP_M).void).toBe(true);
  });

  it("reaches the ceiling at the top of the range", () => {
    expect(readJourney(1e27).ceiling).toBe(true);
  });

  it("lands on the fingerprint milestone at its home gap", () => {
    expect(readJourney(5e-4).milestone).toBe(MILESTONES[4]);
  });
});
