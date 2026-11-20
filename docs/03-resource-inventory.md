# 03 — Resource Inventory & Licensing

Rule of this project: **every asset is either (a) written by us, (b) procedurally generated at runtime, or (c) an openly-licensed library carried with its license.** Nothing is downloaded into the game from third parties; politician photos are used only as *documentation references* (docs/reference/, never loaded by the game).

## Library / third-party code

| Asset | Category | Source | License | Use | Status |
|-------|----------|--------|---------|-----|--------|
| three.module.js r160 | 3D library code | `github.com/mrdoob/three.js` (npm `three@0.160.0`) | MIT (kept at `vendor/three/LICENSE.three`) | Renderer | Acquired, unmodified |
| GLTFLoader.js, OrbitControls.js | 3D library code | same | MIT | GLB import / orbit camera | Acquired, unmodified |

## Generated assets (original, no external source)

| Asset | Category | Source | License | Use | Status |
|-------|----------|--------|---------|-----|--------|
| All character models (Pramod Kaka, Ranyalo Por caricatures) | 3D models | `src/characters.js` — original procedural code | Project original | Fighters | Created |
| All animations (idle/walk/jump/attacks/hit/KO/win/taunts) | Animation | `src/animator.js` — original keyframe system | Project original | Fighters | Created |
| Arena 1 ASSEMBLY, Arena 2 PEOPLES PATH, Arena 3 MIRAMAR | 3D environments | `src/arenas.js` — procedural | Project original | Stages | Created |
| All SFX (punch/kick/heavy/special/hit/block/KO/round/menu/ambience) | Audio | `src/audio.js` — WebAudio synthesis | Project original | Combat/UI | Created |
| Voice/announcer clips | Audio | generated for this project via Arena speech tool (performed parody voices) | Project original | Announcer, intros, quotes | Created — see manifest `assets/audio/manifest.json` |
| Game code | Source | this repo | Project original | — | Created |

## Research references (documentation only — NOT distributed in game)

| Asset | Category | Source | License | Intended use | Status |
|-------|----------|--------|---------|--------------|--------|
| Pramod Sawant photo (Indep. Day) | image | indianexpress.com article (Aug 2022) | © Indian Express — fair-use research reference | visual reference only | Acquired (docs/reference) |
| Pramod Sawant press conf. ×2 | image | frontline.thehindu.com (2024, 2025) | © The Hindu Group — research reference | visual/gesture reference | Acquired (docs/reference) |
| Pramod Sawant journey photo | image | drpramodsawant.in (official) | © owner — research reference | clothing reference | Acquired (docs/reference) |
| Goa Assembly complex | image | Wikipedia/Tarun Bharat/goaholidayhomes | © owners — research reference | Arena 1 design | Acquired (docs/reference) |
| Miramar Beach | image | Getty/Expedia search results | © owners — research reference | Arena 3 design | Acquired (docs/reference) |
| Fontainhas street | image | Outlook Traveller/Tripoto/iStock | © owners — research reference | Arena 2 design | Acquired (docs/reference) |
| Sawant speech themes ("double-engine government", etc.) | text | ANI / India Today / TOI coverage | public news reporting — cited in docs/02 | dialogue *inspiration* only (all lines rewritten as parody) | Documented |

## Politician recordings policy (explicit)

- **No** audio recordings of real politicians are included, downloaded, or cloned.
- Voice clips are original parody performances (synthesised for the game) — labelled "parody game audio" in the game's credits/help.
- No fabricated statement is presented as a genuine quotation; docs quote only from cited public reporting.

## User-supplied assets (runtime, never bundled)

- GLB uploads and background images supplied by the player at runtime via the Arena GLB Transform panel are loaded locally (object URLs), never persisted into the repo.
