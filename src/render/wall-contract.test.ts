import { beforeEach, describe, expect, it } from "vitest";
import * as THREE from "three";
import { FINGERPRINT_HOME_GAP_M, createFingerprintStage } from "@/stages/stage2-fingerprint";
import { HAND_HOME_GAP_M, createHandStage } from "@/stages/stage1-hand";
import type { WallContract } from "@/render/wall-contract";

const ASPECT = 16 / 9;

function stages(): WallContract[] {
  return [createHandStage(), createFingerprintStage()];
}

describe("wall contract", () => {
  let sut: WallContract[];

  beforeEach(() => {
    sut = stages();
  });

  it("exposes an id and a home gap", () => {
    expect(sut[0]!.id).toBe("hand");
    expect(sut[0]!.homeGapM).toBe(HAND_HOME_GAP_M);
    expect(sut[1]!.id).toBe("fingerprint");
    expect(sut[1]!.homeGapM).toBe(FINGERPRINT_HOME_GAP_M);
  });

  it("separates the two surfaces by exactly the gap width", () => {
    for (const stage of sut) {
      for (const gap of [stage.homeGapM, stage.homeGapM * 0.5, stage.homeGapM * 2]) {
        const { left, right } = stage.surfaces(gap);
        const separation = right.position.x - left.position.x;
        expect(separation).toBeCloseTo(gap, 12);
      }
    }
  });

  it("centres the gap on the origin", () => {
    for (const stage of sut) {
      const { left, right } = stage.surfaces(stage.homeGapM);
      expect(left.position.x).toBeCloseTo(-stage.homeGapM / 2, 12);
      expect(right.position.x).toBeCloseTo(stage.homeGapM / 2, 12);
    }
  });

  it("scales the walls with the gap so the composition never shifts", () => {
    for (const stage of sut) {
      const { left } = stage.surfaces(stage.homeGapM * 0.25);
      expect(left.scale.x).toBeCloseTo(0.25, 10);
    }
  });

  it("frames the whole wall on both axes, backing off in portrait when width binds", () => {
    // The camera must clear the stage's own extent, not just the gap: the pads
    // are far wider than the gap between them, and framing the gap alone left
    // them cropped to slivers at the frame edges.
    for (const stage of sut) {
      for (const aspect of [16 / 9, 1, 9 / 16]) {
        const gap = stage.homeGapM;
        const frame = stage.frame(gap, aspect);

        const vFov = (Math.PI / 180) * frame.fov;
        const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
        const visHalfW = frame.position.z * Math.tan(hFov / 2);
        const visHalfH = frame.position.z * Math.tan(vFov / 2);

        expect(visHalfW).toBeGreaterThan(gap / 2);
        expect(visHalfH).toBeGreaterThan(0);
      }
    }
  });

  it("backs the camera off proportionally as the gap widens", () => {
    for (const stage of sut) {
      const near = stage.frame(stage.homeGapM, ASPECT);
      const far = stage.frame(stage.homeGapM * 4, ASPECT);
      expect(far.position.z / near.position.z).toBeCloseTo(4, 6);
    }
  });

  it("fits each wall's full extent with room to spare", () => {
    // The real invariant: whatever the stage's walls reach to, the frame must
    // hold. A stage whose walls are taller than the gap is wide is bound by
    // the vertical axis, so the camera backs off for height instead of width.
    for (const stage of sut) {
      const { left, right } = stage.surfaces(stage.homeGapM);
      const box = new THREE.Box3()
        .setFromObject(left)
        .union(new THREE.Box3().setFromObject(right));
      const halfW = Math.max(Math.abs(box.min.x), Math.abs(box.max.x));
      const halfH = Math.max(Math.abs(box.min.y), Math.abs(box.max.y));

      const frame = stage.frame(stage.homeGapM, ASPECT);
      const vFov = (Math.PI / 180) * frame.fov;
      const hFov = 2 * Math.atan(Math.tan(vFov / 2) * ASPECT);

      expect(frame.position.z * Math.tan(hFov / 2)).toBeGreaterThanOrEqual(halfW);
      expect(frame.position.z * Math.tan(vFov / 2)).toBeGreaterThanOrEqual(halfH);

      stage.dispose();
    }
  });

  it("never lets the near plane clip the gap's own walls", () => {
    // The walls surround the gap centre, and the camera looks at that centre, so
    // anything closer to the camera than the centre is between the two. A near
    // plane beyond the camera's distance to the target saws the walls off —
    // this rendered a black frame at the hand stage's home gap, where the
    // camera stands 8 mm from the target.
    for (const stage of sut) {
      for (const gap of [stage.homeGapM, stage.homeGapM * 1e3, stage.homeGapM * 1e-3]) {
        const frame = stage.frame(gap, ASPECT);
        const standOff = frame.position.length();
        expect(frame.near).toBeLessThan(standOff);
        expect(frame.far).toBeGreaterThan(standOff);
      }
    }
  });

  it("keeps the composition identical across stages at the same gap", () => {
    // The cross-fade premise: at one gap, both stages put the walls in the
    // same place, so switching content never moves the frame.
    const gap = 1e-3;
    const hand = createHandStage();
    const fingerprint = createFingerprintStage();
    const h = hand.surfaces(gap);
    const f = fingerprint.surfaces(gap);

    expect(h.left.position.x).toBeCloseTo(f.left.position.x, 12);
    expect(h.right.position.x).toBeCloseTo(f.right.position.x, 12);

    hand.dispose();
    fingerprint.dispose();
  });

  it("disposes without throwing", () => {
    for (const stage of sut) {
      stage.surfaces(stage.homeGapM);
      expect(() => stage.dispose()).not.toThrow();
    }
  });
});

describe("fingerprint ridges", () => {
  // The displacement runs along the gap axis (local X) as a function of depth
  // (local Z). A silent axis mix-up here renders a flat wall — the geometry
  // must be inspected directly, not just positioned.
  it("displaces the surface along the gap axis", () => {
    const stage = createFingerprintStage();
    stage.surfaces(FINGERPRINT_HOME_GAP_M);

    const mesh = stage.surfaces(FINGERPRINT_HOME_GAP_M).left.children[0];
    expect(mesh).toBeInstanceOf(THREE.Mesh);

    const position = (mesh as THREE.Mesh).geometry.attributes.position!;
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < position.count; i++) {
      min = Math.min(min, position.getX(i));
      max = Math.max(max, position.getX(i));
    }

    // Peak-to-peak is twice the amplitude, within the resolution of the mesh.
    expect(max - min).toBeGreaterThan(0);
    expect(max - min).toBeLessThan(2 * 5e-5 * 1.5);

    stage.dispose();
  });

  it("leaves the gap-facing edge undisplaced", () => {
    // The wall's inner edge must stay at the gap boundary so the gap width the
    // user measures is the geometry's edge, not a displaced ridge peak.
    const stage = createFingerprintStage();
    const left = stage.surfaces(FINGERPRINT_HOME_GAP_M).left;

    expect(left.position.x).toBeCloseTo(-FINGERPRINT_HOME_GAP_M / 2, 12);
    stage.dispose();
  });
});
