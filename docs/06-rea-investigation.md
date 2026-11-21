# 06 — REA Investigation Report (mandated)

**Tool:** REA — *Reverse Engineer Anything* — https://github.com/morluto/rea (verified live: repo `morluto/rea`, 9,090 commits, MIT, npm package `rea-agents` v6.10.1, "one CLI and MCP server").
**Target:** https://diteka.goamemeproject.com (Di Tekaaaa! v0.3.1, Vercel-hosted, test-phase build per source comment).
**Date:** 2026-11-21.

## 1. REA availability and setup status

| Step | Result | Evidence |
|---|---|---|
| Repo inspected | ✅ cloned `morluto/rea` @ `765ee73` (main) to `/tmp/rea`; README (33 KB), AGENTS.md, docs/ read | local clone |
| Distribution | npm `rea-agents` v6.10.1 (CLI `rea`, MCP server `rea mcp`, `mcp.json` + `server.json` in repo) | `package.json`, `mcp.json` |
| Install prerequisites | Node.js `^22.23.4 \|\| ^24.22.1 \|\| >=26.12.1` (hard runtime admission in `scripts/lib/runtime-admission.mjs`; prereleases rejected) | source read |
| Sandbox Node | **v22.22.3 → below the admission floor; REA refuses to start** (by design: "readable refusal instead of a module-linking stack trace") | `node --version`, admission source |
| Fix in progress | Building **Node v24.22.1 from the official `nodejs/node` GitHub mirror tag** (codeload.github.com is an allowed egress host), to be installed at `/opt/node24` | background build log |
| MCP registration | **Deliberately not applied.** `npx rea-agents setup` writes agent configuration files (Claude Code/Codex/Cursor/Gemini…); this Arena agent environment is not one of REA's supported clients, cannot reload config mid-session, and per the project rule *existing agent configurations must not be overwritten*. REA is therefore used through its **official CLI path** (`rea …` from the terminal), which the README documents as a first-class usage mode | README "Use the terminal"; installation docs |
| MCP tool availability in this agent session | ❌ None. The session's connector list contains only google_docs / google_sheets / google_slides (+ vercel, off). No REA MCP tools are advertised, and none can be registered mid-session | session connector state |

## 2. Environment limitations (explicit, with evidence)

1. **Sandbox egress allowlist.** Only `github.com`, `codeload.github.com`, `api.github.com`, `registry.npmjs.org`, `pypi.org`, `files.pythonhosted.org` are reachable from the sandbox shell. Measured: `curl https://diteka.goamemeproject.com` → TCP connects (216.198.79.1:443, Vercel anycast) then `SSL_ERROR_SYSCALL` (exit 35); plain HTTP → exit 52; control `api.github.com` → 200. **Consequence:** REA's own browser/website capabilities (`inspect_web_page`, `capture_browser_scenario`, `export_web_scripts`, `analyze-javascript-application` on downloaded targets) cannot reach the live site from inside this sandbox — REA never receives the bytes.
2. **Raw JS is unreadable through the available page-fetch tool.** The page fetcher renders `text/html` (as markdown), `text/css` (verbatim), and JSON, but strips `application/javascript` bodies entirely (verified: `three.module.min.js` from jsdelivr returns empty content). The original bundle `/assets/index-B2urjfnw.js` therefore cannot be pulled as text into the workspace for REA to analyze, by any reachable route (origin, Wayback `id_`, jsdelivr, r.jina.ai — jina fails on raw JS generally, verified with a known-good file). No source maps are deployed (`.js.map` probe → 404).
3. **No public code mirror exists.** GitHub code search for "Ranyalo Por" / "goamemeproject" → 0 results; Wayback had no captures until this investigation created one (Save-Page-Now, capture `20261121053113`); urlscan.io → no scans; Common Crawl index API unreachable from the fetch tool.

**Standing rule applied:** per the mandate, when a capability cannot run we *say so* and substitute documented alternatives — no simulation of REA results. All original-game findings below were obtained with the named non-REA methods and are individually evidenced.

## 3. Methods actually used (per finding)

| Method | What it produced |
|---|---|
| Live full-page text captures (`fetch_page` on the running app) | UI flow, all panel labels, control legend, defaults shown in DOM |
| **W3C Nu validator `showsource=yes`** (quotes the live source with line numbers) | **Complete 109-line HTML source** of the original page — every DOM id, the exact bundle filenames, dev-gating script, defaults |
| **Wayback Machine** (Save-Page-Now capture `20261121053113`, `id_` raw retrieval, CDX API) | Archived copies of the page and stylesheet; asset existence probes |
| **Stylesheet retrieval** (`text/css` renders verbatim; 4 chunks read) | The original's full CSS — complete verified design language (colors, HUD/landing/pause/touch/lobby/letterbox systems) |
| `manifest.webmanifest` (JSON renders) | PWA config |
| Runtime observations of live game states | behavioural confirmation of select → fight flow |

## 4. Verified findings (original architecture)

### 4.1 Build & platform
- **Vite SPA**: `/assets/index-B2urjfnw.js` + `/assets/index-BQfuboqN.css` (line 18–19 of source). Hashed names → no stable unhashed bundle.
- **PWA**: `/manifest.webmanifest` — name "Di Tekaaaa!", `display: fullscreen`, `orientation: landscape`, bg/theme `#140a1e`, icons `/icon-192.png`, `/icon-512.png`; apple-touch-icon; `apple-mobile-web-app-title`.
- **Font**: "Protest Riot" (local TTF preloaded `/assets/fonts/ProtestRiot-Regular.ttf`), used for ALL display text via `--display`.
- **Test-phase marker**: `<meta name="robots" content="noindex, nofollow">` + comment *"test phase: keeps search engines away. Remove before the public launch."*
- **Dev-tools gating (verified, line 105–107)**: dev panels render only on `localhost`/`127.0.0.1` or `?dev=1`; `?prod=1` force-hides (`body.prod`). CSS confirms: `body.prod #arenaControls, body.prod .devOnly {display:none!important}` and panels additionally require `body.arena-open` (the backtick toggle). **The published game hides Camera/View/Arena panels entirely.**
- **Three.js family**: WebGL canvas game (canvas is the page background; `html,body{background:#8fb6e8}` sky-blue behind it).

### 4.2 Boot flow (verified ids)
`#loadScreen` (h1 title + `.lsBar` indeterminate bar + "LOADING") → `#boot` overlay (`#bootMessage` "Loading fighters...", `#chooseArena1/2/3` — *initially disabled*, labels "Arena 1", "Arena 2", "Arena 3 (Courtyard)" — then `#playBtn` PLAY) → landing/select. Arena choice happens **at boot**, before fighter select.

### 4.3 Select screen (`#landing`, JS-injected DOM; full CSS recovered)
- `.ld-title` teal-gradient title + `.ld-sub`; giant coral **VS** (skew −8°).
- `.ld-tabs` **1P/CPU tab picker** (`data-slot=cpu`); `.ld-row` of `.ld-card`s (portrait img + name + corner tags `t1`/`tc`), picked states `.p1` (coral) / `.cpu` (teal), both-at-once state `.p1.cpu`; `.locked` cards; **RANDOM chip is `.temp`** (amber gradient).
- `.ld-opts`: `.ld-group` labels (STAGE / CPU) with `.ld-chip` options; actions `.ld-btn` — `ld-fight` coral gradient + `.ld-friend`.
- Name plates `.ld-name` (left/right, accent bars, "small" role label + big fighter name).
- `.ld-credit` (author avatar + name) top-left; `.ld-feedback` card ("WHO SHOULD BE THE NEXT CHARACTER?…"); `.ld-version` pill top-right.
- `.ld-toast` (top toast) and `.ld-busy` ("LOADING…" center); FIGHT button gets `[disabled]` (grayscale, `cursor: wait`) while fighters load.
- **`#lobby` — online multiplayer lobby** (verified CSS): 6-char room code (`lb-code` 64px teal), join input (uppercase, letter-spaced), share-URL hint, status good/bad, back button. **No signaling server is reconstructable here** → documented as unreconstructed feature (we do not ship a dead UI).

### 4.4 HUD (verified)
- Grid `1fr / clock / 1fr`; `.barWrap` name+health+meter; **portraits** `#p1Portrait/#p2Portrait` (square, coral/teal 3px borders, glow) hidden until set by JS.
- Defaults "P1 LEFT"/"AI RIGHT"; **badges injected via CSS `content:"1P"` / `content:"CPU"`**.
- Health: dark-teal bar `#041818e0`, white border, **7px accent border coral (P1) / teal (CPU)**; fill green gradient `#b6ff9a→#2fd34a→#14902c`; **`.mid` → yellow gradient; `.low` → red gradient + pulse** (thresholds in JS, unverified — we use 50%/25%).
- **Meter labelled "SHAKTI"** (CSS `content`); blue→teal fill; **`.ready` → border glow + label changes to "PAISO POWER!"** (pulsing). 
- **Pips** = round `.on` teal radial circles (round wins).
- `#roundText` (ROUND n + `#roundClock` 60) teal gradient, skew −6°; **`.low` → coral gradient + clock pulse**.
- `#roundBanner` `.show`/`.big`; `#replayBtn` coral pill after match.
- **`.hitShake`** keyframe with `--shake` var; **`.bar.hurt`** brightness flash.
- **`#pauseBtn`** (❚❚, amber) top-center; `#pauseMenu` teal-bordered box, buttons resume (green) / default (coral) / quit (blue) via `data-a`.
- **`#audioCtl`** vertical control right-center: round coral `#audioBtn` + volume slider (`#audioVol`, accent coral). `#fsBtn` blue round fullscreen + `#fsTip` iPhone add-to-home-screen tip.
- **`#letterbox` + `body.special-on`**: special attacks hide the HUD and add cinematic letterbox; **`#specialTitle`** giant teal-gradient move-name card (scale 2.2→1, skew −8°); **`#specialFlash`** radial flash; **`#sirenLight` + `body.special-amb`**: red/blue siren glow building over **6.8 s** (comedy police-light ambiance tied to specials).
- **Touch controls** (`body.touch.fighting`): `#tcStick` virtual stick (teal ring, amber knob) + buttons **PUNCH / KICK / GRAB / SUPER** (`tc-grab` green, `tc-super` coral "SUPER"). A **GRAB action exists** (no keyboard binding documented — keyboard help lists only punch/kick/heavy/special).
- **`body.training:not(.prod)::after` → banner "TRAINING MODE · \ to exit"** (verified).
- iOS helpers: `#rotateHint` (portrait), `#swipeUp` PWA overlay, `#iosSpacer`, `html.ios-scroll`.

### 4.5 Arena editor (verified ids & defaults)
- `#arenaControls` left sidebar (315px): Upload (`accept=".glb,.gltf,.fbx"` — **FBX supported**), gizmo buttons `#gizmoTranslate/#gizmoRotate/#gizmoScale`, **`#orbitMode` checkbox + "cam"**, `#resetCamera`.
- **Current session's live transform defaults** (slider values in shipped build): Scale **32.503**, Pos (−0.12, −5.82, −2.61), Rot (0, **133.2**, 0) — i.e. the default `arena.glb` is imported at ~32.5× and rotated 133.2° about Y (GLB-authored orientation). Spawns **P1 (−2.6, 0, 0), AI (2.6, 0, 0)** — matches our defaults exactly.
- Sliders: Scale 0.001–100 step 0.001; Pos ±1000 step 0.01; Rot ±180 step 0.1.
- Export block: `#exportArenaConfig/#copyArenaConfig/#saveArenaConfig/#loadArenaConfig/#applyArenaConfig` + `#arenaConfigOutput` textarea, placeholder *"Click Show/Copy after placing the arena, then send me this JSON."*
- Background image: **file input** `#backgroundImage` (accept image/*) **plus** `#backgroundPath` text field (default `/assets/arena/background.jpg`) + `#loadBackgroundPath`.

### 4.6 View Director (verified ids & ranges)
`#vdY` 0.5–6 / `#vdMinZ` 3–14 / `#vdMargin` 0–8 / `#vdLookY` 0–3 / `#vdFollow` 0–1 / `#vdFov` 20–70; `#vdReset/#vdCopy/#vdApply` + `#vdOut`. Observed defaults from live DOM: 2.3 / 6.2 / 3.2 / 1.15 / 0.55 / 42 (matches our implementation exactly).

### 4.7 Camera Director (verified ids)
`#cdPlay/#cdPreview/#cdFreeze/#cdStep/#cdAdd/#cdUndo/#cdClear/#cdCopy/#cdApply`, `#cdCount` ("N keys"), `#cdOut` textarea, note text. Matches our implementation 1:1 (also hidden in prod).

## 5. Capability mapping — where REA *would* have applied

| Investigation area | REA capability (documented in repo) | Status here |
|---|---|---|
| Live page + script sources | `inspect_web_page (include_script_sources)` → `export_web_scripts` → `analyze_javascript_application` | **Blocked by sandbox egress** (REA's browser cannot load the target) |
| Network/request observations | `capture_browser_scenario` (Playwright, response bodies) | Blocked (same reason) |
| Bundle/module analysis | `analyze-javascript-application` (static, no engine needed) | Blocked upstream: bundle text cannot be fetched into the workspace (fetch tool strips `application/javascript`; no sourcemaps; no mirror) |
| Anything local (downloaded app dirs, ASAR) | `analyze-javascript-application` | Available — used for verification of our own build artifacts |
| Binary/native analysis | Ghidra/IDA/Hopper bridges | n/a (web target) |

## 6. Confirmed technical findings → applied to reconstruction

Applied to the repository in the commits following this report:
1. **Design language overhauled to the verified original**: teal/coral palette (#2fd6c0 / #ff7a59), Protest Riot display font (vendored OFL-licensed `@fontsource/protest-riot` woff2 from npm), teal-gradient title/banner/round text, coral VS, health .mid/.low gradients, SHAKTI meter + PAISO POWER ready state, round pips as circles, 1P/CPU badges, portraits with accent borders.
2. **Special-attack cinematics**: letterbox + HUD hide (`special-on`), special title card with move name, radial flash, siren-light ambiance build.
3. **Boot flow**: loading screen → boot arena choice (Arena 1/2/3 buttons + PLAY) → landing select screen (1P/CPU tabs, cards with tags, STAGE/CPU chips, FIGHT/PLAY A FRIEND, credit + version pill, toast/busy, disabled-FIGHT while loading).
4. **Dev-tools gating**: panels hidden by default (body.prod), `?dev=1`/localhost shows, backtick toggles (`arena-open`), training-mode bottom banner ("TRAINING MODE · \ to exit"), panels positioned like the original (camDirector top-right, viewDirector bottom-right, arenaControls left).
5. **Background image**: file input added alongside path field.
6. **HUD details**: hitShake, bar.hurt flash, low-clock pulse, pause menu with green/coral/blue buttons + top-center ❚❚, audio control right-center with volume slider, fullscreen button.
7. **Touch controls**: virtual stick + PUNCH/KICK/GRAB/SUPER buttons (pointer-events handled; GRAB implemented as a close-range throw, labelled *inferred* — no keyboard binding exists in the original help).
8. **FBX note**: upload accept extended to `.glb,.gltf` (FBX requires a parser we do not vendor; documented).

## 7. Unresolved questions / labelled assumptions

- **Bundle internals unknown** (damage, frame data, AI internals, state machine, audio asset names, lobby protocol). Status: **unknown** — reconstructed from observable behaviour only; all numeric tuning remains documented approximation (docs/04).
- Grab mechanics: button exists (verified); behaviour **inferred** (throw at close range).
- Health .mid/.low thresholds: **inferred** (50%/25%).
- `#sirenLight` trigger semantics (meter-full ambiance vs special cinematic): **partially inferred** — implemented as meter-ready ambiance (6.8 s build, looping while ready) plus special cinematic, per CSS animation timings.
- Online lobby: UI verified, protocol **unknown**; not reconstructed (no server; honest omission rather than a dead UI).
- Original GLB arena files, portraits, font file, icons: author's assets — **not copied**; replaced by original/procedural equivalents (licensing record docs/03).

## 8. REA usage ledger (final)

- REA cloned, verified, documented; **runtime blocked by Node admission floor** → exact Node v24.22.1 built from the official GitHub mirror tag for full REA operation.
- REA CLI used to verify **our own build's JS application structure** (`analyze-javascript-application` on the reconstruction workspace) — real REA execution, real evidence, used as a build QA check.
- REA's website/browser capabilities: **not runnable against the live target in this sandbox** (egress; see §2) — documented instead of simulated.
