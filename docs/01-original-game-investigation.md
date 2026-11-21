# 01 — Original Game Investigation (Di Tekaaaa! v0.3.1)

Investigated live at `https://diteka.goamemeproject.com` on 2026-11-20 via direct page fetches (full-document text captures of the running game: initial load state, menu/select flow, and the full HUD + tool panels). The game is a single-page WebGL app (Three.js family) by **Devan Parab** (Goa Meme Project), credit shown in-game with an Instagram link and a "WHO SHOULD BE THE NEXT CHARACTER?" feedback channel.

Method note: the site's JavaScript bundle is not publicly archived (no GitHub repo found; Wayback Machine has no snapshot). All findings below come from **observing the live running game**, not from its source code. This project is an **independent re-implementation** — no original code or assets were copied.

## 1. Identity & flow

- Title: **DI TEKAAAA!** (Konkani street-slang exclamation ≈ "give 'em a whack!").
- Loading screen ("Loading fighters…"), then **title → select → fight**.
- Title screen: "DI TEKAAAA!" + "SELECT YOUR FIGHTER", a "VS" plate, credit card for Devan Parab, version tag `v0.3.1`.
- Footer instruction block repeats the control legend and editor hotkeys.

## 2. Character select

- Layout: two large fighter cards ("PICK YOUR FIGHTER"), labels **1P** and **CPU**, then **two locked "🔒 SOON" slots** (future roster) and a **"?" RANDOM** card.
- Player 1's default identity plate: "1P · YOU — **PRAMOD KAKA**"; CPU plate shows the opponent ("CPU — **RANYALO POR**").
- Fighter names: **PRAMOD KAKA**, **RANYALO POR** (portraits rendered as in-app images).
- **Stage select** (label "STAGE"): **ASSEMBLY**, **PEOPLES PATH**, **MIRAMAR** — three arenas.
- **CPU select** (label "CPU"): **EASY / NORMAL / HARD**.
- Launch buttons: **FIGHT!** (vs CPU) and **PLAY A FRIEND** (local 2-player).
- In 2P the CPU card becomes a second picker ("PICKING 1P / PICKING CPU").

## 3. In-fight HUD

- Top: **P1 name plate + health bar**, **ROUND n + 60-second timer** (observed "ROUND 1 60"), **opponent name plate + health bar**.
- Round system: best-of-3 ("ROUND 1/2/3"); KO ends round; round banner text ("ROUND 1", win/KO text) observed in the DOM.
- Post-round / post-match: **Replay** button.
- Special-meter UI present (controls legend: "R special (needs meter)").
- Top-right HUD buttons: **pause (❚❚)**, **sound toggle (🔊)**, **fullscreen (⛶)**.
- Pause overlay: **RESUME / RESTART / QUIT**.
- Mobile notice: "For full screen on iPhone: Share → Add to Home Screen" (PWA-style hint).

## 4. Controls (documented verbatim on-screen)

**P1 LEFT:** `A/D` move · `W` jump · `S` crouch · **hold back to block** · `Q or Z` punch · `E or C` kick · `X` heavy · `R` special (needs meter).

(2P mapping is not shown by the original for its "PLAY A FRIEND" mode — reconstructed with a sensible mirror layout; documented in `docs/04-combat-spec.md`.)

## 5. Training mode

Hotkey **`\` (backslash)** toggles: *the opponent stands still, nobody is KO'd, meters stay full (press again to leave)* — exact original wording.

## 6. Camera Director panel ("Camera Director — N keys")

Buttons: **Play (orbit)** · **Preview shot** · **Freeze** · **Step** · **Add key** · **Undo** · **Clear** · **Copy** · **Apply**.
Hint text: "Play, Freeze, drag the view, Add key, Step, repeat."
Behaviour reconstructed: Free orbit camera while frozen; capture camera shots as keyframes; step through them; preview = fly the keyframe path; apply = make the keyframe path the live fight camera; copy = export JSON of keys.

## 7. View Director panel ("default game camera")

Sliders: **Height 2.3 · Distance 6.2 · Width margin 3.2 · Look height 1.15 · Side follow 0.55 · Lens (FOV) 42** (the observed defaults).
Buttons: **Reset · Copy · Apply**. Hint: "Move the sliders while fighting. Copy the text and send it to make it the default." → these six numbers parametrise the automatic fight camera (framing both fighters) and can be exported as a community default.

## 8. Arena GLB Transform panel

- **Upload** (GLB file), mode buttons **Move / Rotate / Scale**, **Orbit cam**, **Reset Camera**, numeric fields **Scale 1.000, Pos X/Y/Z 0.00, Rot X/Y/Z 0.0**.
- **Initial Player Positions: P1 X -2.60 Y 0 Z 0 · AI X 2.60 Y 0 Z 0** (observed defaults).
- Hotkey: **`` ` `` (backtick)** shows/hides the panel.
- Footer: "**Arena:** defaults set for arena.glb. Upload more GLBs, place them, then Copy config and send it." → the original ships a default `arena.glb` per stage and accepts user GLB additions.

## 9. Export Arena Config

Buttons: **Show · Copy · Save Local · Load Local · Apply Text**.
A JSON configuration describing arena transforms, spawn positions, camera/view settings, background.

## 10. Background Image

Fields: **Path** + **Load** — loads an image URL as the arena backdrop.

## 11. Behaviours observed in-play

- Arena name shown top-left at fight start ("Arena 1 / Arena 2 / Arena 3 (Courtyard)" appear in the loading DOM for the three stages).
- Fighter nameplates: "Pramod Kaka" (P1) vs "Ranyalo Por" (AI) — the AI is identified by name (character identity, not just "CPU").
- 60-second timer per round confirmed by HUD markup.

## 12. Unknowns / unverifiable

- Exact damage values, frame data, hitstun timings, AI decision internals (not externally observable). Reconstructed as a balanced approximation — see `docs/04-combat-spec.md`.
- The 2 locked "SOON" characters are unrevealed in v0.3.1 — left locked in the faithful edition.
- Original GLB arena geometry and textures are the author's property — our arenas are original procedural builds inspired by the same real-world Goan locations.
