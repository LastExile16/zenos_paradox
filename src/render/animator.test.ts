import { describe, expect, it } from "vitest";
import {
  GAP_TAU,
  SETTLE_RELATIVE,
  approach,
  crossedDecades,
  isSettled,
} from "@/render/animator";

describe("approach", () => {
  it("never overshoots", () => {
    let display = 0.01;
    for (let i = 0; i < 1000; i++) display = approach(display, 0.005, 1 / 60);
    expect(display).toBe(0.005);
  });

  it("moves the same distance in the same elapsed time regardless of frame rate", () => {
    const target = 0.01;
    // Fixed frame counts, not a clamped time accumulator: accumulating dt in a
    // float lands a hair short of the deadline, and the clamp then feeds a
    // sub-nanosecond final step that snaps to the target by a different route
    // at each frame rate.
    const run = (fps: number): number => {
      let d = 0.02;
      for (let i = 0; i < Math.round(0.5 * fps); i++) d = approach(d, target, 1 / fps);
      return d;
    };
    // 30, 60, and 240 fps over half a second must all agree.
    expect(run(30)).toBeCloseTo(run(60), 6);
    expect(run(60)).toBeCloseTo(run(240), 6);
  });

  it("retargets mid-flight without cancelling the motion", () => {
    let display = 0.01;
    display = approach(display, 0.005, 0.1); // heading down
    const midway = display;
    display = approach(display, 0.02, 0.1); // user reverses
    expect(display).toBeGreaterThan(midway);
    expect(display).toBeLessThan(0.02);
  });

  it("snaps to the target within epsilon and reports settled", () => {
    let display = 0.01;
    for (let i = 0; i < 500; i++) display = approach(display, 0.005, 1 / 60);
    expect(display).toBe(0.005);
    expect(isSettled(display, 0.005)).toBe(true);
  });

  it("does not move when the display is already at the target", () => {
    expect(approach(0.005, 0.005, 1 / 60)).toBe(0.005);
  });

  it("does not move on a zero-width time step", () => {
    expect(approach(0.01, 0.005, 0)).toBe(0.01);
  });

  it("respects a custom time constant", () => {
    const fast = (() => {
      let d = 0.01;
      for (let i = 0; i < 10; i++) d = approach(d, 0.005, 1 / 60, GAP_TAU / 4);
      return d;
    })();
    const slow = (() => {
      let d = 0.01;
      for (let i = 0; i < 10; i++) d = approach(d, 0.005, 1 / 60, GAP_TAU * 4);
      return d;
    })();
    expect(Math.abs(fast - 0.005)).toBeLessThan(Math.abs(slow - 0.005));
  });

  it("never produces NaN", () => {
    expect(Number.isNaN(approach(NaN, 0.005, 1 / 60))).toBe(true);
    expect(Number.isNaN(approach(0.01, NaN, 1 / 60))).toBe(true);
  });

  it("counts the decades a transition crosses", () => {
    expect(crossedDecades(0.01, 0.001)).toBe(1);
    expect(crossedDecades(0.01, 1e-4)).toBe(2);
    expect(crossedDecades(0.001, 0.01)).toBe(-1);
    expect(crossedDecades(0.01, 0.01)).toBe(0);
    expect(crossedDecades(0, 0.001)).toBe(0);
  });
});

describe("settling", () => {
  it("settles even when the target is atomic-scale", () => {
    // An absolute epsilon would snap instantly here, larger than the target.
    const target = 5.3e-11; // Bohr radius
    let display = 1e-9;
    for (let i = 0; i < 5000; i++) display = approach(display, target, 1 / 60);
    expect(display).toBe(target);
    expect(isSettled(display, target)).toBe(true);
  });

  it("settles at the subnormal floor", () => {
    // Steps near the floor round away to zero, stranding the display a few ULPs
    // from the target; the animator must still arrive there.
    const target = Number.MIN_VALUE;
    let display = 1e-300;
    for (let i = 0; i < 5000; i++) display = approach(display, target, 1 / 60);
    expect(display).toBe(target);
  });

  it("does not strand the display when steps round away to nothing", () => {
    const target = Number.MIN_VALUE;
    let display = 7 * target; // the fixed point: a step from here is +0
    expect(approach(display, target, 1 / 60)).toBe(target);
  });

  it("is relative, so it works at every scale the journey covers", () => {
    for (const target of [1e27, 0.01, 5e-4, 5e-11, Number.MIN_VALUE]) {
      let display = target * 10;
      for (let i = 0; i < 5000; i++)
        display = approach(display, target, 1 / 60);
      expect(display).toBe(target);
    }
  });

  it("is finer than anything visible", () => {
    expect(SETTLE_RELATIVE).toBeLessThan(1e-4);
  });
});
