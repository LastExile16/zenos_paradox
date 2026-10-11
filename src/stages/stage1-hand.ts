/**
 * Stage 1 — the human hand.
 *
 * Two fingertip pads face each other across the gap. Clarity over anatomical
 * detail (docs/design.md §6): a rounded capsule reads as a fingertip at a
 * glance, which is what the opening screen needs.
 *
 * The hand is content, not frame: around the cell stage there is no hand left,
 * so nothing here may assume it persists past the fingerprint boundary.
 */

import * as THREE from "three";
import {
  type CameraFrame,
  type WallContract,
  type WallExtent,
  type WallSurfaces,
  frameGap,
  mountWall,
  placeWall,
  disposeWallGeometries,
} from "@/render/wall-contract";

/** The home gap: a relaxed 10 mm between thumb and index finger. */
export const HAND_HOME_GAP_M = 0.01;

/** Fingertip dimensions at the home gap, in metres. */
const PAD_RADIUS = 0.0075; // ~15 mm across
const PAD_LENGTH = 0.014;

export function createHandStage(): WallContract {
  const material = new THREE.MeshStandardMaterial({
    color: 0x8a6f5c,
    roughness: 0.72,
    metalness: 0.02,
  });

  const left = mountWall("left", pad(), PAD_RADIUS);
  const right = mountWall("right", pad(), PAD_RADIUS);

  function pad(): THREE.Mesh {
    // Capsule axis is Y: a vertical rounded pillar, like a fingertip seen
    // edge-on. Its nearest surface sits at local x = 0, so mounting it at
    // x = ±PAD_RADIUS keeps the pad tangent to the gap boundary.
    const geometry = new THREE.CapsuleGeometry(PAD_RADIUS, PAD_LENGTH, 12, 32);
    return new THREE.Mesh(geometry, material);
  }

  function surfacesAt(gapM: number): WallSurfaces {
    placeWall(left, "left", gapM, HAND_HOME_GAP_M);
    placeWall(right, "right", gapM, HAND_HOME_GAP_M);
    return { left, right };
  }

  function extentAt(gapM: number): WallExtent {
    const scale = gapM / HAND_HOME_GAP_M;
    // The pad's outer edge stands off from the gap boundary by its offset
    // plus its own radius, both of which scale with the gap.
    return {
      halfWidth: gapM / 2 + 2 * PAD_RADIUS * scale,
      halfHeight: (PAD_LENGTH / 2 + PAD_RADIUS) * scale,
    };
  }

  return {
    id: "hand",
    homeGapM: HAND_HOME_GAP_M,
    surfaces: surfacesAt,
    frame: (gapM: number, aspect: number): CameraFrame =>
      frameGap(gapM, aspect, extentAt(gapM)),
    dispose(): void {
      disposeWallGeometries(left);
      disposeWallGeometries(right);
      material.dispose();
    },
  };
}
