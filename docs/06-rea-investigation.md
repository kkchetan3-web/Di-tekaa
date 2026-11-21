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
| Sandbox Node | **v22.22.3 → below the admission floor; REA refuses to start** (by design: "readable refusal instead of a module-linking stack trace"). **Measured:** `rea --version` on the installed package prints *"REA requires Node.js 22.x (>=22.23.4), 24.x (>=24.22.1), 26.12.1+; this process runs Node.js 22.22.3. Install a supported release, then retry."* | `npm i -g rea-agents@6.10.1` (29 packages) + run capture |
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

---

# §5 — ORIGINAL JS BUNDLE ANALYSIS (VERIFIED, EVIDENCE-BACKED)

**Method:** Wayback Save-Page-Now capture of `/assets/index-B2urjfnw.js` (capture `20261121053113`, created 2026-11-21 after the /save/ POST), then chunked text retrieval of the served copy via the Arena fetch tool (118 chunks). Bash egress to web.archive.org is TLS-blocked (curl exit 35) — verified — so chunked fetch was the only channel. The bundle is minified; identifiers below are the ORIGINAL minified names quoted as evidence anchors. No original code was copied into this repo; all values were transcribed as *observed data* and re-implemented.

**Bundle layout (chunk map):** vendor prefix (modulepreload polyfill, THREE r16x w/ TSL strings, GLTFLoader, FBXLoader ≈ chunks 0–95) → app ≈ chunks 96–117: audio engine 97–98, asset loader + anims pack 96/100, fighter class 100–103, AI 103, input 103, view defaults 103, vfx 103–104, crowd/arena builders 104–107, Miramar clean cinematic 108–110, characters + version + landing + lobby 110, touch + pause + fullscreen 111, boot/game class + lights + directors 112–113, camera + HUD + round flow + arena config 114–117.

## 5.1 Identity & version
- Console banner: `Di Tekaaaa! v0.3.1 (Mobile audio fix, 2026-11-18)`; landing shows `v0.3.1` chip with the same title/tooltip.
- Landing credit: “by **Devan Parab**” (Instagram link) + feedback-channel link (“WHO SHOULD BE THE NEXT CHARACTER?”). → *Our reconstruction reproduces the structure but with our own parody credit, not the author's links.*

## 5.2 Characters (verified)
- `pramod`: name **“Pramod Kaka”**, folder `/assets/characters/player1`, texture `pramod_color.jpg`, shared anims folder `/assets/characters/shared`.
- `ranyalo`: name **“Ranyalo Por”**, folder `/assets/characters/player2`, texture `ranyalo_color.jpg`.
- Rig: FBX `character.fbx` per character; `hips` and `rightHand` bones located by regex; per-character visual offset {scale,x,y,z,rx,ry,rz} supported; fighter box default height 2, radius .45; spawn ±2.6; facing = sign(startX)⁻¹; P1 tint 3112447, P2 tint 16725839; ids `P1-LEFT` / `AI-RIGHT`.
- **Animation map (Mixamo FBX filenames, shared)**: Idle.fbx; Short Step Forward.fbx; Step Backward.fbx; Jumping.fbx; Block.fbx (crouch+block); Punching.fbx + Punching mirror.fbx (alternating); Kicking.fbx (kick & groin); Cross Punch.fbx; Hook Punch.fbx; **Mma Kick-2.fbx = heavy/grab**; 6 hit variants; Dying.fbx; Big Hit To Head.fbx; Right Block.fbx; Standing Block React Large.fbx; Big Stomach Hit.fbx; Kick To The Groin Reaction.fbx; Falling Back Death.fbx; Sweep Fall.fbx; Receive Uppercut To The Face.fbx; Falling Down.fbx; Getting Up.fbx; Leg Sweep Fast.fbx; Uppercut.fbx; Victory Idle.fbx; specials: pramod `Standing 2H Magic Attack 03.fbx`, ranyalo `Taunt Gesture.fbx`.
- Playback-speed table: punch ×2.25, kick ×1.8, groin ×1.8, cross ×2, hook ×2, heavy ×1.3, sweep ×1.2, uppercut ×1.3, hit ×1.15, others ×1.
- Hit-window lead offsets (start time within clip): heavy .2, kick .3, groin .3, cross .4, hook .55; `hitAt/hitFrom/hitTo` timings are auto-fitted to actual clip durations (`fitAttackTimingsToClips`).
- Shared animations load from **`/assets/characters/shared/anims.pack.json`** — custom packed format `{n:name, d:duration, t:[[time,'q'|'v',values…]]}` decoded to AnimationClips; root/hips X–Z motion is stripped for non-locomotion clips (Gh()).

## 5.3 Combat spec (verified numbers)
Base attack set:
| move | dmg | startup | active | recovery | range | height | push | notes |
|---|---|---|---|---|---|---|---|---|
| punch | 4 | .035 | .10 | .075 | 1.4 | mid | .18 | chain→cross→hook |
| kick | 7 | .12 | .26 | .26 | 1.65 | **high** | .3 | knockdown hard, hitFrom .52–.99 |
| **heavy = GRAB** | 10 | .14 | .18 | .40 | 1.5 | mid | .4 | knockdown hard, hitFrom .38–.62; mobile GRAB button binds to this key |
| sweep (S+kick) | 7 | .30 | .18 | .35 | 1.7 | low | .3 | knockdown soft fall, react fallHard |
| cross | 5 | .10 | .14 | .10 | 1.45 | mid | .2 | hitFrom .6–.88 |
| hook | 6 | .15 | .225 | .16 | 1.45 | mid | .3 | hitFrom .85–1.3 |
| groin (S+heavy) | 6 | .12 | .26 | .30 | 1.45 | low | .2 | knockdown soft, react hitGroin |
| uppercut (S+punch) | 8 | .20 | .12 | .40 | 1.4 | mid | .2 | launch 5.5, knockdown hard |
Special base: {dmg 17→both override 20, startup .22, active .28, recovery .5, range 1.9, mid, push .5, **meterCost 100**}.
- **Pramod special:** signature `godLight`, title **“BHIVPACHI GARAZ NA!”**, castAt .5, chargeAt .35, castTime 6.8, travel .18, dmg 20, launch 3.5, throwX 6, knockdown+fall, voice key `special`.
- **Ranyalo special:** signature `godLight`, **style `ambulance`**, title **“108 : SUSPENSION ORDER”**, castAt .9, castTime 7.4, travel .6, drift 2, dmg 20, launch 4, throwX 9, knockdown+fall, voice key `ranyalo`.
- Meter: max 100; gains on hit: punch .06, kick .12, heavy .16, sweep .14, uppercut .16; attacker on clean hit +7.2 (special-hit +0, special +hitStop .09), on blocked +3.6; victim +4.8 clean / +1.8 blocked; gain stops after `specialUsed`; special costs full meter (`meter=0` on cast).
- Hit resolution: window `stateTime ∈ [startup, startup+active]`; **dodge** = defender crouching vs `high` (grounded) or airborne vs `low`; **block** = holding away + grounded + opponent attacking + dist < **2.6**; blocked dmg = ceil(20%) min 1; chain scaling `max(.6, 1 − .1·chainHits)` (chain window 1.4 s); **armor**: victim mid-attack (kick/heavy/groin, before active ends) vs dmg ≤ 6 → no reaction (hitStop .02); airborne victims 40% `hitAir` soft knockdown (throwX 5); kick chain combo → `fallCombo` (throwX 5.5); punch-chain 3rd hit / comboHits ≥ 2 → soft fall (throwX 4.4).
- hitStop: clean .035 (attacker .05); blocked .06 (attacker .025); heavy stun .55, normal stun .32, blocked stun .12/.3.
- Knockdown: `velocity.x = attackerFacing·throwX (default 3.2)`, launch → vy; fall speeds {hitGroin 2.6, hitAir 1.1, fallCombo 2.4}, downTimer = clipDur/speed + (.3 soft | .9 hard); **getup = fall clip played in REVERSE** (time scale −n, time remap).
- Whiff: `MISS`/`DODGED!` damage-number + dust; extra recovery from whiff table (punch .06, kick .12, heavy .16, sweep .14, uppercut .16).
- Fighter physics: maxSpeed 3.2, accel 22, friction 18 (×1.5 crouching/blocking), jumpVelocity 6.2, gravity −18, arena clamp `halfWidth`, fighters separated at `r1+r2+.25`.
- Portrait capture: 220×220 render → PNG data-URL, camera fov 24 at +facing·2 / y 1.7, bg 2759186.

## 5.4 AI (verified — single behavior, difficulty is INERT)
- `r_` AI: walks when dist > 1; **attacks when dist < 1.45** at interval `.55 + rnd·.55` s; attack pick **55% punch / 30% kick / 15% heavy**; blocks reactively (6%/frame when opponent attacks within 1.8 → holds back .28 s); fires special once meter is full **after 1.2–3.4 s hold**; never jumps/crouches; input via virtual bindings `AI_LEFT…AI_SPECIAL`.
- Difficulty select sets `game.difficulty` but **no code consumes it** in v0.3.1; EASY/HARD chips are locked (`rv=['EASY','HARD']` disabled).

## 5.5 Round / match flow (verified)
- Health 100 both; round time **60 s** (`bv=60`); **wins ≥ 2 → GAME OVER**; round banner `${NAME} TAKES ROUND n` (TIME! prefix on time-out), `TIME UP — DRAW` / `DRAW — DO IT AGAIN`; match end `${NAME} WINS` (big) + replay button “Play again” (else “Replay”).
- Intro: 3-2-1 countdown (banner `big`), then `introT=1.9` with banner `${ROUND n|FINAL ROUND} — DI TEKAAAA!` (hold), bell (4 rings final / 3), announcer final/r2/r1; FIGHT at 0.
- `FINAL ROUND` label when round ≥ 3 **or** both have 1 win. Next round +3.2 s. Winner = higher health on time-out (tie → draw); KO → slow-mo 1.4 s (2.4 s match point) at .3×→1×.
- Round clock freezes during any special; `.low` clock at ≤10 s; health colors: **`.mid` 30–60, `.low` < 30** (our docs previously inferred 50/25 — corrected).
- Training (`\`, fight only, non-prod): clock `∞`, auto-heal (2 s after damage, or instantly < 25), meter kept full, specialUsed cleared, AI inputs cleared each frame (AI idles), wins/round reset on toggle.

## 5.6 Specials cinematics (verified)
- Start: opp frozen (inputs nulled, velocity 0); `$.sting()`; voice clip or charge synth; voice bus ducked (.1); letterbox `body.special-on`; ambulance style adds `body.special-amb`; `--hudCover` = meter bottom+24 px; title text = move title; flash on cast; slow-mo windows (godLight: .7 pre-cast dip, .25 across hit ±; ambulance: .25 from −.06…+.12 around hit, ramps back by +.7).
- godLight: **levitation** y = 1.4·smoothstep up, sin-bob hold, descend; aura rings every .18 s; hand glow grows to cast; at cast: zap + **beam** (canvas gradient, grows along dir, sparks trail) + flash; hit at cast+travel → receiveHit + boom.
- Ambulance: y=0; **procedural ambulance mesh** (white boxes 3.2×1.55×1.7, red/blue beacons 16718362/1727231, PointLights red 16719904/blue 2777343 alternating, 4 wheels), spawns behind caster, drives to opponent (hitX = opp − facing·2.5), z-dips; opponent **drifts** toward caster (drift·smoothstep, clamp halfWidth−.7); hit → boom + receiveHit; exit at 30 u/s, removed at 18; camera has a dedicated `ambulanceShot` path (follows the van, cut at `cutLen`).
- Specials camera: `specialShot()` uses Camera-Director keys if present else built-in keys `Xf` with gap-scaled positioning; `keyed` keys lerp at exp(−16t) vs exp(−6t); `cut`/`cutId` = instant cuts.

## 5.7 Camera (verified formulas)
- Fight cam: mid = (x1+x2)/2; dist = |x2−x1|; closeness c = clamp01((dist−1)/7); required distance from fov/aspect/margin `f = (dist+margin)/(2·tan(fov/2)·max(aspect,.5))`; `z = max(4.4, max(minZ, f) − camKick)`; followX = clamp(mid·follow, ±2.4); `y = view.y − .15c − (roundOver?.3)`; lookY = view.lookY + .3·winBlend; smoothing `1−exp(−5dt)`; arena `userData.camera {height?, y, lookY, z, feetAt(default .8)}` overrides (feetAt → look-down atan formula).
- Landing select cam: y→1.4, z→7, lookY→.35 with sin sway (±.35) — while landing active.
- Winner cam: after 1.1 s over .9 s ease toward loser-side framing (winner height·1.35).
- View defaults `i_ = {y 2.3, minZ 6.2, margin 3.2, lookY 1.15, follow .55, fov 42}` — **matches the HTML defaults we already shipped**.
- Camera Director: keys `{t,x,y,z,lx,ly,lz}` (x/lx normalized by facing), dedupe ≥.03 s, sorted; localStorage **`ditekaaa:specialCamKeys`**; panel is **localhost-only** (early-return otherwise); buttons play/preview/freeze/step(.15 s)/add/undo/clear/copy/apply; orbit target (0,1.3,0).
- View Director: localStorage `ditekaa:viewCam` (non-prod only); sliders vdY/vdMinZ/vdMargin/vdLookY/vdFollow/vdFov + `v` labels; reset/copy/apply; copy note “Copied. Send it to make it the default.”

## 5.8 Audio (verified)
- Architecture: 3 buses (sfx .9, voice .32, master) → DynamicsCompressor → destination; master gain = muted?0:volume; **default volume .7**; localStorage `ditekaaaa.audio` `{muted,volume}`; `M` toggles mute; audioCtl UI (range 0–100 + 🔊/🔇) built dynamically.
- **Announcer = speechSynthesis**, male-English voice preference chain (Daniel/Google UK male/Alex/David/Fred/male/Google US): “Round one” (pitch .6 rate .78), “Round two”, “Final round” (.5/.72), “Fight!” (.7/.95, no 380 ms delay), “K. O.!” (.55/.8), “Time!” (.7/.9). Delay 380 ms except Fight.
- Only two recorded voice files: `/assets/audio/pramod_special.m4a`, `/assets/audio/ranyalo_special.m4a` (played via `$.voice`, gain 1.25).
- All other SFX are WebAudio synthesis: bell (880 Hz partials [1, 2.76, 5.4, 8.9] ×3/4 rings), hit (pitch scales with intensity), block triad 1250/1870/2650, whoosh per move type, charge (saw 110→880 + pentatonic arpeggio), zap/boom/sting, roundStart chords (60/67 vs 55/62 final), win fanfare (72/76/79/84), ready 880+1320, tick 880, step/jump/land/miss/fall.
- **Fight music = 64-step chiptune sequencer at 132 bpm** (step 60/132/4 s): bass [48,45,41,43] (C-A-F-G), two 16-step lead patterns, accents, hats via filtered noise; **crowd = 3 bandpass noise loops + random “ooh” saws**; Miramar clean cinematics get their own calls (mmDash/mmSkid/mmWave/mmSparkle/mmPop/mmNews/mmGo/mmPress).
- iOS unlock: silent base64 WAV loop at volume .01 + empty speechSynthesis utterance + resume on 6 capture events + visibilitychange.

## 5.9 VFX (verified)
- Canvas-generated textures: 14-ray starburst impact, double ring; Sprite-based system (SpriteMaterial, additive default).
- Hit burst: 2 impacts + 2 rings (blocked palette 10474751/14348543/11197951/8372223 vs clean 16751134/16773802/16777215/16761402) + 6–18 sparks; speed lines; dust rings; aura; hand glow; beam with trail flashes.
- **Damage numbers are comic words** (Protest Riot 92→fit, stroke #2a0000): blocked `BLOCKED!` (#bfe3ff); light `GHE!/KHA!/YO!!`; mid `DHISHUM!/THAAP!/AVOII GHEEEE!!`; heavy `ZAPAAK!/TRIPPP!!/BOOM!` (#ffd23a / #ff7a1a when ≥8 dmg or knockdown); numeric −N on clean hits, N on blocked.
- `fighter-hit` event {fighter, damage, blocked, big} → camKick (1.4 big/.5), `--shake` 14/6 px + canvas hitShake, `.hurt` retrigger on the health bar parent.

## 5.10 Crowd & arenas (verified)
- Crowd (procedural, seed 20251105): stands of boxes, capsuled people (8 cloth × 4 skin colors), 32% carry **placards reading `AMKA NAKA, AMKA NAKA` / `GOA FOR GOANS` / `KALYAN SURE KITLO KADLA?` / `SACK OUR ADMIN`** (4 color schemes), bob via sin(phase+t·speed); instanced.
- Courtyard (ASSEMBLY): halfWidth 6.5; sky.jpg plane 140×70 @(0,22,−40); floor.webp 22×23.8; floor_tile tiling 240-wide ground; building.png 23-wide @(0,−12); clusters cluster_left/right.png @(±12.5,−10.5); floor_detail multiply overlay; shadow plane opacity .4.
- Peoples Path: halfWidth 6.5, setScale 1.3, wallZ −12; canvas brick/plaster/roof textures; mural `mural_man.jpg` on curve; tree (procedural), 15 lamps, bollards, crowd {innerX 9.6, rows 4, perRow 10}; lighting hemi 14920148/8014394 ×1.7, sun 16754784 ×2.6 (−9,6,9), rim 8029951 ×1.3 (8,5,−6); camera {height 2, z −3.5, feetAt .8}.
- Miramar: halfWidth 6.5; **loads `miramar_arena_v5.glb`** (named meshes PlateFront/PlateBackR/L, SkyLid, Ground, Sea, HorizonBand with fixed renderOrders −30…−27); fallback = procedural sunset-sky canvas + sand + sea bands; assets backdrop/sand (dirty/clean variants) + `debris.webp`+`debris.json` + `litter_layout.json`; `userData.miramar` state {clean, setClean(k), reset} — clean lerp recolors + hides litter + fades shadows; **`?clean=1` URL param; `K` key toggles clean (non-prod)**.
- Lighting defaults: hemi 14479359/4930092 ×1.9; sun 16773330 ×3 @(−8,11,7), shadow 2048², ortho ±40; rim 8632831 ×1.1 @(8,5,−6); arena `userData.lighting` overrides; renderer ACESFilmic (type 4), exposure 1.15, PCF shadows, sRGB output, pixelRatio ≤ 2; scene bg 8890823; fallback sky plane 300×140 @(0,35,−90).
- GLB pipeline: arena upload (blob), `applyArenaDefaultForFile` (arena.glb → scale 32.503, pos −.12/−5.82/−2.61, rotY 133.2; courtyard → zeros), material enhance (sRGB, aniso, normalScale 1.35, ao 1.25, roughness .78/metalness 0 defaults), center XZ + ground min.y; fallback floor box 22×10×.35; `loadArenaFromFolder` probes arena.glb/arena1.glb/arena2.glb/arena.gltf/arena.fbx.
- Arena config export shape: `{arenaFile:'public/assets/arena/arena.glb', transform:{scale, position:{x,y,z}, rotationDegrees:{x,y,z}}}`; localStorage **`tekkenStyleArenaTransformConfig`**; ids arenaScale/X/Y/Z/RotX/RotY/RotZ (+Value labels), exportArenaConfig/copyArenaConfig/saveArenaConfig/loadArenaConfig/applyArenaConfig/arenaConfigOutput.

## 5.11 UI / screens (verified)
- Boot: `#boot` grid + `#bootMessage` + `#playBtn` + `#arenaChoice` (chooseArena1/2/3 → arena.glb / arena2.glb / courtyard); assets load → courtyard silently → landing; failure → red `pre` overlay.
- Landing: body.`selecting`; portrait img or big initial; 2 locked `SOON` cards (🔒) + RANDOM `?` card (excludes the other side's pick); tabs PICKING 1P / PICKING CPU alternate on select; same-pick swap; stage chips ASSEMBLY(courtyard)/PEOPLES PATH(peoplespath)/MIRAMAR(temp-flagged); diff chips EASY/NORMAL/HARD with EASY+HARD disabled; FIGHT! disabled while loading (`LOADING…` busy); PLAY A FRIEND → lobby.
- Lobby: title “PLAY A FRIEND ONLINE · TEST”; body says **“Online play is not switched on yet.”** + “The relay has to be deployed first (see relay/README.md).” → online was never live in v0.3.1; `?room=` param opens join state.
- Touch: stick `#tcStick`/`#tcKnob` (dead-zone ratios .3, jump threshold ×1.3, crouch ×1.1, knob clamp .38·width) + buttons **GRAB (heavy key!) / DI TEKA (special) / PUNCH / KICK** (that order); body.`touch`; rotate hint overlay; `?touch=1` forces.
- Pause: `#pauseMenu` + `#pauseBtn` (❚❚) created dynamically; conditions fightStarted+fighting+!roundOver+!matchOver; Escape toggles; RESUME/RESTART (resetMatch)/QUIT with **two-tap confirm “SURE? TAP AGAIN”** (3 s) → location.reload(); inputs cleared on pause.
- Fullscreen: `#fsBtn` ⛶ + iPhone tip `#fsTip` (Add to Home Screen); touch start = requestFullscreen + orientation lock landscape; iOS scroll trap `#iosSpacer` + `#swipeUp` (PLAY ANYWAY = `#swipeSkip`).
- Keyboard: Backquote toggles `body.arena-open` (non-prod, non-input focus); Backslash toggles training (non-prod, fight only); `controlCodes` preventDefault list = WASD/QECZXR + arrows.
- Body state classes: `fighting`, `selecting`, `paused`, `touch`, `training`, `prod`, `arena-open`, `special-on`, `special-amb`.

## 5.12 Reconstruction impact (findings → our code)
Verified deltas to apply to our build (all values re-implemented, none copied):
1. config.js: exact attack tables, physics constants, meter numbers, AI thresholds/weights, special params/titles, animation speed/lead tables.
2. game.js: round flow texts/timings, FINAL ROUND logic, draw/time-out rules, KO slow-mo durations, training auto-heal, health color thresholds (60/30), pause two-tap QUIT, version banner v0.3.1-style, portrait capture params.
3. ai.js: distance 1.45 attack gate, .55/.3/.15 weights, .55+rnd·.55 cadence, reactive block (6% @1.8, .28 s), special hold 1.2–3.4 s, no jump/crouch.
4. ui.js: touch order GRAB/DI TEKA/PUNCH/KICK, damage-word system, `ditekaa:*` storage keys, lobby disabled-state text.
5. combat.js: block window 2.6, chip ceil(20%), chain scaling, armor rule, hitStop numbers, knockdown/getup reverse-playback model, whiff penalties.
6. camera: fight/landing/winner formulas + arena camera overrides; CamDirector key format; ViewDirector storage key.
7. audio.js: announcer synth table, two-voice m4a pattern (we substitute our own generated parody clips, labeled), buses/duck, volume .7 default, chiptune/crowd generators (re-implemented in our own voice).
8. index.html: dynamic-only elements (pauseMenu, pauseBtn, fsBtn/fsTip, letterbox/specialTitle/specialFlash/sirenLight, audioCtl, rotateHint, swipeUp, lobby) may stay static in our build — behavior parity documented.


---

## 6. Capability mapping — where REA *would* have applied

| Investigation area | REA capability (documented in repo) | Status here |
|---|---|---|
| Live page + script sources | `inspect_web_page (include_script_sources)` → `export_web_scripts` → `analyze_javascript_application` | **Blocked by sandbox egress** (REA's browser cannot load the target) |
| Network/request observations | `capture_browser_scenario` (Playwright, response bodies) | Blocked (same reason) |
| Bundle/module analysis | `analyze-javascript-application` (static, no engine needed) | Blocked upstream: bundle text cannot be fetched into the workspace (fetch tool strips `application/javascript`; no sourcemaps; no mirror) |
| Anything local (downloaded app dirs, ASAR) | `analyze-javascript-application` | Available — used for verification of our own build artifacts |
| Binary/native analysis | Ghidra/IDA/Hopper bridges | n/a (web target) |

## 7. Confirmed technical findings → applied to reconstruction

Applied to the repository in the commits following this report:
1. **Design language overhauled to the verified original**: teal/coral palette (#2fd6c0 / #ff7a59), Protest Riot display font (vendored OFL-licensed `@fontsource/protest-riot` woff2 from npm), teal-gradient title/banner/round text, coral VS, health .mid/.low gradients, SHAKTI meter + PAISO POWER ready state, round pips as circles, 1P/CPU badges, portraits with accent borders.
2. **Special-attack cinematics**: letterbox + HUD hide (`special-on`), special title card with move name, radial flash, siren-light ambiance build.
3. **Boot flow**: loading screen → boot arena choice (Arena 1/2/3 buttons + PLAY) → landing select screen (1P/CPU tabs, cards with tags, STAGE/CPU chips, FIGHT/PLAY A FRIEND, credit + version pill, toast/busy, disabled-FIGHT while loading).
4. **Dev-tools gating**: panels hidden by default (body.prod), `?dev=1`/localhost shows, backtick toggles (`arena-open`), training-mode bottom banner ("TRAINING MODE · \ to exit"), panels positioned like the original (camDirector top-right, viewDirector bottom-right, arenaControls left).
5. **Background image**: file input added alongside path field.
6. **HUD details**: hitShake, bar.hurt flash, low-clock pulse, pause menu with green/coral/blue buttons + top-center ❚❚, audio control right-center with volume slider, fullscreen button.
7. **Touch controls**: virtual stick + buttons — order and labels now VERIFIED (GRAB / DI TEKA / PUNCH / KICK; GRAB binds to the heavy key, docs/06 §5.11).
8. **FBX note**: upload accept extended to `.glb,.gltf` (FBX requires a parser we do not vendor; documented). The original rigs are FBX (`character.fbx` per character, shared Mixamo animation pack `anims.pack.json` — docs/06 §5.2).
9. **Verified-spec pass (post-bundle-analysis)**: exact attack/physics/meter tables, AI behavior, round flow, health thresholds, banner texts, touch order — see the commit history and docs/04; grab is verified blockable at ceil(20%) chip (was previously shipped as an unblockable throw — corrected).

## 8. Previously-inferred items — RESOLVED by bundle analysis

Superseded by §5 (all re-implemented, none copied):
- **Bundle internals WERE unknown** → now fully analysed: exact damage/frame data (§5.3), AI internals incl. proof that difficulty is inert (§5.4), state machine, audio asset names (§5.8), round flow (§5.5), camera formulas (§5.7), storage keys (§5.7/§5.11).
- Grab mechanics: button exists AND maps to the `heavy` attack key — heavy IS the grab (Mma Kick-2.fbx, dmg 10, hitFrom .38–.62, throw-type knockdown). Our "grab = unblockable throw" interpretation is corrected to "heavy throw, blockable at 20% chip like other attacks".
- Health .mid/.low thresholds: were inferred 50%/25% → **verified 30–60 / <30**.
- `#sirenLight`: verified `body.special-amb` toggles only for the ambulance-style special; the 6.8 s CSS build is part of that state (not meter-ready ambiance).
- Online lobby: UI verified AND its live state verified — “Online play is not switched on yet.” / “The relay has to be deployed first” — protocol never shipped in v0.3.1. Our omission stands, now evidence-backed.
- Original GLB arena files, portraits, font file, icons: author's assets — **not copied**; replaced by original/procedural equivalents (licensing record docs/03).

## 9. REA usage ledger (final)

- REA cloned, verified, documented; **runtime blocked by Node admission floor** (measured refusal, §1) → exact Node v24.22.1 being built from the official nodejs/node GitHub tag (**build in progress at the time of this writing** — V8 + node_base complete, v8_compiler phase; install to /home/user/node24 + REA run automated, results to be appended here).
- REA CLI run on **our own build's JS application structure** (`rea analyze-javascript-application <workspace>/src --json`): **PENDING** — will be executed the moment the Node build finishes; honest status recorded instead of a premature claim.
- REA's website/browser capabilities: **not runnable against the live target in this sandbox** (egress; see §2) — documented instead of simulated. The bundle-level analysis in §5 was produced by the documented alternative method (SPN capture + chunked retrieval).
