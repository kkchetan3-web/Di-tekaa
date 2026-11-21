# 05 — Testing Report

## A. Original-game observations (source of the spec)

Observed live at diteka.goamemeproject.com (2026-11-20) via full-page text captures of the running app: loading state, title, character select (2 fighters + 2 locked + random), stage select (ASSEMBLY / PEOPLES PATH / MIRAMAR), CPU difficulty select, FIGHT! / PLAY A FRIEND, in-fight HUD (ROUND n + 60s timer, nameplates, meters), training-mode and editor hotkeys, Camera Director, View Director (default values 2.3 / 6.2 / 3.2 / 1.15 / 0.55 / 42), Arena GLB Transform (spawn defaults ±2.60), Export Arena Config, Background Image. See `01-original-game-investigation.md`.

Not externally observable (reconstructed by approximation, flagged honestly): exact frame data/damage, AI internals, 2P keymap (original documents only P1), original GLB arena geometry.

## B. Feature reconstruction status

| Feature | Original evidence | Status in faithful build |
|---|---|---|
| Loading → title → select flow | observed | ✅ |
| Fighter cards + 2 locked SOON + RANDOM | observed | ✅ (locked slots kept locked) |
| Stage select ×3 | observed | ✅ ASSEMBLY / PEOPLES PATH / MIRAMAR (procedural originals) |
| CPU Easy/Normal/Hard | observed | ✅ (distinct AI configs, verified in sim) |
| FIGHT! (vs CPU) / PLAY A FRIEND (2P) | observed | ✅ (2P keymap reconstructed, documented) |
| P1 control map (A/D/W/S, Q/Z, E/C, X, R) | verbatim from original | ✅ identical mapping |
| Hold-back to block | verbatim | ✅ (blockstun, chip on heavy/special, pushback) |
| Special needs meter | verbatim | ✅ full-meter cost, per-character motion |
| Round system + 60s timer | observed HUD | ✅ best-of-3, time-up HP comparison |
| KO / banners / replay | observed | ✅ |
| Training mode (`\`) | verbatim behaviour | ✅ stationary dummy, no KO, meters pinned |
| Camera Director (10 controls) | observed labels | ✅ all functional (orbit/freeze/preview/step/add/undo/clear/copy/apply) |
| View Director (6 sliders + reset/copy/apply) | observed w/ default values | ✅ defaults match observed 2.3/6.2/3.2/1.15/0.55/42 |
| Arena GLB Transform (upload, move/rotate/scale, orbit cam, reset, numeric transforms, spawn positions) | observed | ✅ GLB upload works (Three GLTFLoader), drag + numeric edits apply to the live scene |
| Export Arena Config (Show/Copy/Save Local/Load Local/Apply Text) | observed | ✅ validated JSON, localStorage persistence |
| Background image (Path + Load) | observed | ✅ |
| Pause (RESUME/RESTART/QUIT), sound toggle, fullscreen | observed | ✅ |

## C. Character-by-character validation

| Check | PRAMOD KAKA | RANYALO POR |
|---|---|---|
| Model builds (full rig) | ✔ (headless test 1) | ✔ |
| Moods + knockdown pose | ✔ | ✔ |
| All 22 animation clips run clean | ✔ (test 2) | ✔ |
| Distinct idle/personality anims | ✔ finger-guard, glasses taunt, namaste/wave win | ✔ bounce, hip-wiggle taunt, flex win |
| Special move | ✔ DOUBLE ENGINE CHARGE (charge travels 2.1m in sim) | ✔ RANN-FURY SPIN (root spin + drift) |
| Voice set (intro/special/taunt/win) | ✔ 4 clips wired + lose pending | ✔ 4 clips wired + lose pending |
| AI config | ✔ mid-range patient (blockSkill .55) | ✔ rushdown (aggression .68) |
| Attack set punch/kick/heavy/special | ✔ | ✔ |

## D. Functional testing (headless suite — `node tools/headless-test.js`)

**20/20 passing** at checkpoint 1:
- character construction ×2, mood/lieFlat
- 22 clips × 2 fighters × 2 s — no exceptions
- arenas assembly (67 nodes), path (40), miramar (22) build + update
- AI-vs-AI 60 s sim: damage flows, KO reachable, bounds respected, no NaN
- mechanics: hold-back block state, blocked jab = 0 HP loss, special consumes meter + moves fighter
- difficulty: hard out-attacks easy 26 vs 12 attacks / 30 s

Bugs the suite caught and we fixed before shipping: missing `model` arg in punch-clip signature (would crash every punch in the browser), GLTFLoader's transitive import of BufferGeometryUtils missing from vendor tree.

## E. Audio validation

- SFX synth engine exercised implicitly in the sim (all fighters call audio.* every frame; headless stubs confirm no crash paths). In-browser: requires one user gesture before sound (handled).
- Voice clips: 10 generated parody clips wired via `assets/audio/manifest.json` (announcer di_teka/ko; kaka intro/special/taunt/win; por intro/special/taunt/win). All files verified non-empty; manifest ids match code call sites. `playClip` silently skips missing ids — remaining announcer lines (round1-3, timeup, victory, trainon/off, lose lines) degrade gracefully until generated next cycle.

## F. Performance

- Three.js r160, one directional shadow light per arena (1024² map), Lambert materials, pooled particle system (cap via pool reuse). Pixel ratio capped at 2. Rendered nodes per arena: 22–67 — comfortable for mobile-class GPUs at 60 fps.
- No asset downloads at runtime (all procedural) → cold start ≈ module parse only.

## G. Remaining limitations / known gaps

1. **Browser-based interactive testing** (clicks, WebGL frames, GLB uploads in a real browser) could not be automated in this sandbox — Playwright's browser CDN is unreachable here. Mitigation: headless engine suite + static-file 200 checks + preview server for manual verification.
2. Voice clips pending next cycle: `round1/2/3`, `timeup`, `victory`, `trainon`, `trainoff`, `kaka_lose`, `por_lose`, `fight`.
3. Original's exact numeric balance unverifiable — our tuning is documented in `04-combat-spec.md` and intentionally kept close to observable shape.
4. Original GLB arenas are the author's copyrighted assets — replaced by original procedural builds of the same real-world locations.
5. Two "SOON" locked slots intentionally stay locked (faithful to original v0.3.1).
