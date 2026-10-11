/**
 * Stage 2 — skin and fingerprints.
 *
 * The pads dissolve into their own surface: two ridged walls, like canyon
 * walls. This is the transition that proves the whole visual language
 * (docs/eng-plan.md, critical path 1), because it must read as the SAME gap at
 * a different scale, not a new picture.
 *
 * Ridges are real geometry, not a texture: a displacement function over the
 * wall, so the canyon reads under any lighting.
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

/** The home gap: characteristic fingerprint ridge spacing, ~0.5 mm. */
export const FINGERPRINT_HOME_GAP_M = 5e-4;

/** Wall extent at the home gap, in metres. Proportional, so it scales with the gap. */
const WALL_HEIGHT = 1.6e-3;
const WALL_DEPTH = 2.4e-3;

/** Ridge spacing ~0.1 mm, amplitude ~0.05 mm: real epidermal dimensions. */
const RIDGE_WAVELENGTH = 1e-4;
const RIDGE_AMPLITUDE = 5e-5;

export function createFingerprintStage(): WallContract {
  const material = new THREE.MeshStandardMaterial({
    color: 0xb08c72,
    roughness: 0.68,
    metalness: 0.02,
  });

  const left = mountWall("left", ridgeWall(), 0);
  const right = mountWall("right", ridgeWall(), 0);

  /**
   * A ridged surface: a plane in the Y/Z plane (facing across the gap) with
   * vertices displaced along X by a sine over their depth, so the ridges run
   * vertically and recede into the distance.
   */
  function ridgeWall(): THREE.Mesh {
    const segments = 96;
    const geometry = new THREE.PlaneGeometry(
      WALL_DEPTH,
      WALL_HEIGHT,
      segments,
      segments,
    );
    geometry.rotateY(Math.PI / 2); // plane normal: +Z -> along the gap axis

    // After the rotation, depth runs along local Z and the gap axis is local X.
    const position = geometry.attributes.position!;
    const frequency = (2 * Math.PI) / RIDGE_WAVELENGTH;
    for (let i = 0; i < position.count; i++) {
      const depth = position.getZ(i);
      position.setX(i, Math.sin(depth * frequency) * RIDGE_AMPLITUDE);
    }
    position.needsUpdate = true;
    geometry.computeVertexNormals();

    return new THREE.Mesh(geometry, material);
  }

  function surfacesAt(gapM: number): WallSurfaces {
    placeWall(left, "left", gapM, FINGERPRINT_HOME_GAP_M);
    placeWall(right, "right", gapM, FINGERPRINT_HOME_GAP_M);
    return { left, right };
  }

  function extentAt(gapM: number): WallExtent {
    const scale = gapM / FINGERPRINT_HOME_GAP_M;
    return {
      halfWidth: gapM / 2 + RIDGE_AMPLITUDE * scale,
      halfHeight: (WALL_HEIGHT / 2) * scale,
    };
  }

  return {
    id: "fingerprint",
    homeGapM: FINGERPRINT_HOME_GAP_M,
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
