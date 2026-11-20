# DI TEKAAAA! — Independent Reconstruction

An independent, fan-made reconstruction and expansion of the Goan political-satire browser fighting game **Di Tekaaaa!** (original by Devan Parab / Goa Meme Project — https://diteka.goamemeproject.com). This repo contains two separate editions:

| Edition | Entry | What it is |
|---|---|---|
| **Faithful Edition** | `index.html` | 1:1 reconstruction of the observed original v0.3.1 feature set |
| **Enhanced Satire Edition** | `enhanced.html` | Same core + upgraded visuals, finisher camera, match stats, taunt key, best-of-3/5 |

> **Parody notice:** unaffiliated with the original author. All characters are original procedural caricatures; all dialogue is original parody game audio (no politician recordings, no voice clones, no fabricated "real" quotes). See `docs/` for the full research, licensing and testing record.

## Run

No build step. Any static file server works:

```bash
npm start          # python3 -m http.server 8000
# → http://localhost:8000/index.html        (faithful)
# → http://localhost:8000/enhanced.html     (enhanced)
```

## Controls (faithful, as in the original)

**P1:** `A/D` move · hold **away** to block · `W` jump · `S` crouch · `Q`/`Z` punch · `E`/`C` kick · `X` heavy · `R` special (full meter)

**Tools:** `` ` `` Arena GLB Transform panel · `\` training mode · `Esc` pause
**P2 (PLAY A FRIEND):** arrows + `,` `.` `/` `P`

## Feature map

- 2 researched fighters: **PRAMOD KAKA** (parody of a Goa CM caricature) and **RANYALO POR** (community persona) — rigged, animated procedurally, with original parody voice sets
- 3 arenas: **ASSEMBLY** (Goa Assembly hall), **PEOPLES PATH** (Fontainhas-style street), **MIRAMAR** (beach at dusk)
- Best-of-3 rounds, 60s timer, meter specials, hit-stop, knockdowns, blocking, combo chains
- CPU AI: Easy/Normal/Hard, reactive blocking, anti-air, per-character spacing/personality
- **Camera Director** (orbit/freeze/step/add-key/undo/clear/copy/apply/preview)
- **View Director** (height/distance/width-margin/look-height/side-follow/FOV, copy/apply/reset)
- **Arena GLB Transform** (GLB upload, move/rotate/scale drag + numeric, orbit cam, spawns)
- **Export Arena Config** (Show/Copy/Save Local/Load Local/Apply Text) + Background image loader
- Training mode (stationary opponent, no KO, full meters)

## Dev

```bash
node tools/headless-test.js   # headless combat/AI/animation/arena test suite
npm run start                 # static server
```

Structure: `src/` engine modules (config, audio, characters, animator, arenas, camera, combat, ai, editor, ui, game) · `src/enhanced/` enhanced-edition deltas · `vendor/three/` Three.js r160 (MIT) · `docs/` research & reports · `assets/audio/` generated voice clips + `manifest.json`.

Project documentation: `docs/ROADMAP.md` → `01-original-game-investigation` → `02-character-research` → `03-resource-inventory` → `04-combat-spec` → `05-testing-report`.
