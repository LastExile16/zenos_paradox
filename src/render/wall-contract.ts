/**
 * The wall contract — the extension interface every stage implements.
 *
 * The central architectural decision of the project (docs/ceo-plan.md,
 * "Approach A — gap-frame invariant"): the gap, not the hand, is the invariant
 * that survives all ~27 halvings. Every stage is the SAME gap with the SAME two
 * walls; only the content between the walls and the camera distance change.
 *
 * To add a stage, implement this interface. That is the whole contract.
 *
 * Coordinate system:
 *   X — across the gap. The left wall faces +X, the right wall faces -X.
 *   Y — up.
 *   Z — depth. The camera looks along -Z at the origin, between the walls.
 *
 * Wall composition is a house style, not per-stage taste: both walls sit at
 * x = ∓gap/2 and scale uniformly with the gap, so a cross-fade between any two
 * stages at the same gap never moves the composition.
 */

import * as THREE from "three";

/** The two facing surfaces that form the gap. */
export interface WallSurfaces {
  readonly left: THREE.Object3D;
  readonly right: THREE.Object3D;
}

/** Where the camera sits to frame the gap. All derived from the gap width. */
export interface CameraFrame {
  readonly position: THREE.Vector3;
  readonly target: THREE.Vector3;
  readonly fov: number;
  /**
   * Depth bounds. The camera stands about one gap-width from the walls, so a
   * fixed near/far cannot survive 27 orders of magnitude: at the hand stage's
   * home gap the camera sits 8 mm from the target, and a 10 mm near plane
   * would clip the pads away. Both scale with the camera distance.
   */
  readonly near: number;
  readonly far: number;
}

export type WallSide = "left" | "right";

/**
 * A stage of the journey. One implementation per scientific representation.
 */
export interface WallContract {
  readonly id: string;
  /** The gap width, in metres, where this stage is at home. */
  readonly homeGapM: number;
  /** Two facing surfaces separated by exactly `gapM`. */
  surfaces(gapM: number): WallSurfaces;
  /** Camera framing that keeps both surfaces in view at `gapM`. */
  frame(gapM: number, aspect: number): CameraFrame;
  /** Release GPU resources. Called once, when the stage leaves the journey. */
  dispose(): void;
}

/** Vertical field of view shared by every stage, in degrees. */
export const HOUSE_FOV_DEG = 50;

/** Breathing room around the gap, as a multiple of the half-gap. */
export const FRAME_MARGIN = 1.25;

/** The camera sits slightly above the gap axis, looking down into it. */
const CAMERA_PITCH_RATIO = 0.15;

/** Depth bounds as a multiple of the camera's distance from the gap. */
const NEAR_RATIO = 1e-3;
const FAR_RATIO = 1e2;

/**
 * Derive the framing for a gap width and viewport aspect.
 *
 * Portrait viewports (aspect < 1) have a narrower horizontal field of view, so
 * the camera must stand back further to fit the gap. Framing is never stored;
 * it is recomputed from the gap whenever the user moves.
 */
export function frameGap(gapM: number, aspect: number): CameraFrame {
  const vFov = THREE.MathUtils.degToRad(HOUSE_FOV_DEG);
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * Math.max(aspect, 1e-6));
  const distance = ((gapM / 2) * FRAME_MARGIN) / Math.tan(hFov / 2);
  return {
    position: new THREE.Vector3(0, gapM * CAMERA_PITCH_RATIO, distance),
    target: new THREE.Vector3(0, 0, 0),
    fov: HOUSE_FOV_DEG,
    near: distance * NEAR_RATIO,
    far: distance * FAR_RATIO,
  };
}

/**
 * Mount a wall surface so its inner edge sits at the gap boundary.
 *
 * `outwardOffset` is how far the surface's own geometry bulges out from the
 * gap boundary, measured at the stage's home gap. The wall group is then scaled
 * by gapM/homeGapM, which scales the offset too — so the surface stays tangent
 * to the gap at every width.
 */
export function mountWall(
  side: WallSide,
  surface: THREE.Object3D,
  outwardOffset: number,
): THREE.Group {
  const group = new THREE.Group();
  surface.position.x = side === "right" ? outwardOffset : -outwardOffset;
  group.add(surface);
  return group;
}

/**
 * Position and scale a wall for `gapM`. The composition invariant:
 * the inner surface lands at x = ±gapM/2 at any width.
 */
export function placeWall(
  wall: THREE.Object3D,
  side: WallSide,
  gapM: number,
  homeGapM: number,
): void {
  wall.position.x = side === "right" ? gapM / 2 : -gapM / 2;
  wall.scale.setScalar(gapM / homeGapM);
}

/**
 * Dispose every mesh geometry under a wall. Stages share one material between
 * their two walls, so each stage disposes that separately.
 */
export function disposeWallGeometries(wall: THREE.Object3D): void {
  wall.traverse((o) => {
    if (o instanceof THREE.Mesh) o.geometry.dispose();
  });
}
