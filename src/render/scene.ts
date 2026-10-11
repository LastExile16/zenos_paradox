/**
 * The scene — one Three.js renderer driving every stage.
 *
 * This is the piece that makes the wall contract visible rather than merely
 * tested: it asks each stage for its surfaces and framing, cross-fades between
 * them by blend weight, and chases the model through the animator. It owns no
 * state of the journey — the arbitrator does — it only draws what it is given.
 */

import * as THREE from "three";
import { approach } from "@/render/animator";
import { type WallContract } from "@/render/wall-contract";
import { type Journey, blendFrame, blendStages } from "@/transition";

export interface SceneHandle {
  /** Advance one frame toward the model's target width. */
  tick(targetGapM: number, dt: number): void;
  /** Tear down listeners and GPU resources. */
  dispose(): void;
}

interface ActiveStage {
  stage: WallContract;
  group: THREE.Group;
}

export function createScene(
  container: HTMLElement,
  journey: Journey,
  initialGapM: number,
): SceneHandle {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setClearColor(0x0a0a0a, 1);
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    50,
    container.clientWidth / container.clientHeight,
    0.01,
    1e6,
  );

  // ponystack: a fixed three-point rig, not a per-stage lighting setup. Every
  // stage shares it so a cross-fade never changes the light.
  scene.add(new THREE.AmbientLight(0x40403c, 1.6));
  const key = new THREE.DirectionalLight(0xf2f0e6, 1.2);
  key.position.set(0.4, 0.6, 1);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xddeae0, 0.5);
  rim.position.set(-0.5, -0.2, -0.8);
  scene.add(rim);

  const active = new Map<string, ActiveStage>();
  let display = initialGapM;

  function ensureStage(stage: WallContract): ActiveStage {
    const existing = active.get(stage.id);
    if (existing) return existing;

    const group = new THREE.Group();
    const surfaces = stage.surfaces(initialGapM);
    group.add(surfaces.left, surfaces.right);
    scene.add(group);
    const entry: ActiveStage = { stage, group };
    active.set(stage.id, entry);
    return entry;
  }

  function aspect(): number {
    return container.clientWidth / container.clientHeight;
  }

  function onResize(): void {
    const w = container.clientWidth;
    const h = container.clientHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", onResize);

  function tick(targetGapM: number, dt: number): void {
    display = approach(display, targetGapM, dt);

    // Cross-fade by blend weight: stages fade in as the user approaches and
    // out as they pass. Held stages (weight 1 outside every decade) stay fully
    // visible, so the scene never empties.
    for (const { stage, weight } of blendStages(journey, display)) {
      const entry = ensureStage(stage);
      const surfaces = stage.surfaces(display);
      entry.group.children[0]!.position.copy(surfaces.left.position);
      entry.group.children[0]!.scale.copy(surfaces.left.scale);
      entry.group.children[1]!.position.copy(surfaces.right.position);
      entry.group.children[1]!.scale.copy(surfaces.right.scale);
      entry.group.visible = weight > 0.001;
      // Walls are groups wrapping the geometry, so walk down to the materials.
      entry.group.traverse((o) => {
        if (!(o instanceof THREE.Mesh)) return;
        const material = o.material as THREE.MeshStandardMaterial;
        material.transparent = true;
        material.opacity = weight;
      });
    }

    // Each stage frames its own walls; blend the candidates by the same
    // weights as the cross-fade so the camera rides the transition instead
    // of snapping between framings at a stage boundary.
    const blended = blendFrame(journey, display, aspect());
    camera.position.copy(blended.position);
    camera.lookAt(blended.target);
    camera.fov = blended.fov;
    camera.near = blended.near;
    camera.far = blended.far;
    camera.updateProjectionMatrix();

    renderer.render(scene, camera);
  }

  function dispose(): void {
    window.removeEventListener("resize", onResize);
    for (const { stage, group } of active.values()) {
      scene.remove(group);
      stage.dispose();
    }
    active.clear();
    renderer.dispose();
    renderer.domElement.remove();
  }

  return { tick, dispose };
}
