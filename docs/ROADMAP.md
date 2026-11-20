# DI TEKAAAA! — Reconstruction Project Roadmap

Independent reconstruction of **Di Tekaaaa!** (https://diteka.goamemeproject.com, by Devan Parab / Goa Meme Project) — a Goan political-satire 3D browser fighting game.

> Every asset in this repository is either created from scratch for this project, procedurally generated at runtime, or is an openly-licensed library (Three.js). No original-game assets are copied. All dialogue is **original parody written for this game** — no fabricated "authentic" quotations, no voice clones.

## Stages

| # | Stage | Status | Evidence / Output |
|---|-------|--------|-------------------|
| 1 | Investigate the original game (live site, UI, controls, systems) | ✅ done | `docs/01-original-game-investigation.md` |
| 2 | Identify original characters & political identities | ✅ done (2/2 playable roster) | `docs/02-character-research.md` |
| 3 | Research public photos, footage, mannerisms, voice references | ✅ done | `docs/02-character-research.md`, `docs/reference/` |
| 4 | Resource inventory + licensing assessment | ✅ living doc | `docs/03-resource-inventory.md` |
| 5 | Technical & gameplay reconstruction spec | ✅ done | `docs/04-combat-spec.md` |
| 6 | Character models, rigging, animation systems | ✅ done (procedural caricatures) | `src/characters.js`, `src/animator.js` |
| 7 | 3D arenas & rendering systems | ✅ done (3 arenas + GLB support) | `src/arenas.js` |
| 8 | Combat, AI, health, scoring, rounds | ✅ done | `src/combat.js`, `src/ai.js` |
| 9 | Camera Director + Arena GLB Transform | ✅ done | `src/camera.js`, `src/editor.js` |
| 10 | Training mode + configuration management | ✅ done | `src/game.js`, `src/editor.js` |
| 11 | Faithful edition complete | ✅ done | `index.html` |
| 12 | Validation against original | ✅ done | `docs/05-testing-report.md` |
| 13 | Enhanced edition | ✅ done | `enhanced.html`, `src/enhanced/` |
| 14 | Testing & delivery | ✅ done | `docs/05-testing-report.md` |

## Editions

- **Faithful Edition** — `index.html`: 1:1 reconstruction of the observed original (v0.3.1 feature set).
- **Enhanced Edition** — `enhanced.html`: separate build — upgraded visuals, extended moves/combos, more audio, extra modes (2P, 3 CPU levels exposed on select screen, training challenges, best-of-5 option).

## Conventions

- Zero build step. Static ES modules + import map (`vendor/three/`). Serve with any static file server (`python3 -m http.server`).
- Characters are **procedurally built caricatures** (original code-generated 3D models, rigged in code) based on researched public visual references — not copies of any photograph, model, or the original game's GLB files.
- All sound effects are synthesized at runtime via WebAudio. All voice lines are **performed/synthesized parody game audio created for this project** (original script, not politician recordings), clearly labelled in-game as parody.
