# Eng Review Test Plan — zenos_paradox
Branch: main | 2026-10-10 | Skill: plan-eng-review

## Affected routes / components
- / (single-page 3D experience): hand → fingerprint vertical slice first (D1 = A).
- Scale model (`src/model/scale.ts`): property tests for halve/double identity, d_n, float limit, never-zero.
- Wall contract interface (`src/render/wall-contract.ts`): stage must expose `surfaces(w) + frame(w)`.
- Input arbitrator (`src/input/arbitrator.ts`): 8 sources, source recorded per write, Reset clears.

## Key interactions to verify
- Pinch, slider, Halve/Double, keyboard arrow, deep-link (?n=&g=) all write same model.
- Deep link (`?g=`) clamps to visual floor; `?n=` prefers `n` over `g` (2C-i resolved in plan).
- Tracking-loss smoothing and camera privacy (stop media, hide indicator) work end-to-end.

## Edge cases
- n reaches 1068 halvings → `d = 0.0` exactly in float64; floor must render void, never `NaN`/`0 mm`.
- Slider at floor passes visual minimum but Halve stays reachable (2C-i split bounds).
- WebGL context lost → restore then fall through to SVG/DOM (2A-i).
- i18n: English-only v1 with RTL plumbing (Sorani + Arabic right-to-left, logical CSS).
- Deep-link number coercion at boundary (no NaN propagation, 3C-i).

## Critical paths (must work before any stage 3-7 work)
1. One full-fidelity transition: hand → fingerprint. Proves wall contract, transition language, motion design.
2. Number model property tests pass (happy, boundary, float limit, never-zero, locale format).
3. Keyboards + screen-reader first-class paths work (not fallbacks) with per-stage text alt.

Coverage diagram: 5/9 number-model paths tested (55%); 1/1 transition E2E planned; 0 stage 3-7 coverage (deferred per D1 vertical slice).

## Implementation tasks (from eng review run 20261010T061200Z)

Vertical-slice order: E1 → E2 → E3 → E4, then E5/E6/E7 in parallel.

| ID | Pri | Component | Title | Files | Status |
|----|-----|-----------|-------|-------|--------|
| E1 | P1 | toolchain | Initialize Vite + TypeScript project | `package.json`, `tsconfig.json`, `vite.config.ts`, `.github/workflows/ci.yml` | done |
| E2 | P1 | scale model | Implement number model property tests | `src/model/scale.ts`, `src/model/scale.test.ts` | done |
| E3 | P1 | wall contract | Define WallContract interface and hand→fingerprint stage | `src/render/wall-contract.ts`, `src/stages/stage1-hand.ts`, `src/stages/stage2-fingerprint.ts` | done |
| E4 | P1 | input | Build single-write-path input arbitrator with source tracking | `src/input/arbitrator.ts` | done |
| E5 | P2 | transition | Implement full-fidelity hand→fingerprint transition | `src/transition.ts`, `src/render/animator.ts` | done |
| E6 | P2 | a11y | Keyboard + screen-reader paths with per-stage text alternatives | `src/a11y/announcer.ts`, `src/a11y/keyboard.ts` | done |
| E7 | P2 | perf | Add degradation ladder scaffold (DPR cap, shadow tiers, LOD) | `src/perf/quality.ts` | done |

## Architecture decisions locked by this review (decision `22c54da1`)

- Toolchain: **Vite + TypeScript + vitest + Playwright**.
- `scaleStage` and `n` are **derived** from `gapWidth`, not independent state.
- Camera framing is **derived** (offset camera), matching the wall contract's `frame(w)`.
- The **wall contract** (`surfaces(w) + frame(w)`) is the in-repo extension interface for every stage.
- A **single write path** (input arbitrator) records the source of each change; `gapWidth` in the scale model is the sole source of truth.

## Unresolved decisions blocking later stages

1. **Atom-stage representation** — Bohr shells vs electron probability density vs quantum cloud with collapse. Changes the mobile rendering budget; must be chosen before Stage 5 is authored.
2. **Soundscape sonic brief** — accepted into scope but has no instrument set or reference. Needs a brief before any audio work.
3. **Deep-link canonical display form** — `?n=` is preferred in policy, but the canonical form used for sharing links was never specified.
