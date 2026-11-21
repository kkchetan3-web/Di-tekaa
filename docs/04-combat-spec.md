# 04 — Combat & Systems Reconstruction Spec

Reconstructed from the original's on-screen documentation + observed HUD. Exact numeric balance of the original is not externally observable; values below are our tuned approximation matching its observable shape (2.5D movement, 60s rounds, meter specials, hold-back blocking).

## Coordinate model
- Fighting plane `z=0`; fighters move on **X** (stage width ±9.6), jump on **Y**. 3D rendering, 2D combat logic (as the original).
- Default spawns: **P1 X −2.60, AI X +2.60, Y 0, Z 0** (observed defaults).

## Input (P1, verbatim from original)
`A/D` move · `W` jump · `S` crouch · **hold back to block** · `Q`/`Z` punch · `E`/`C` kick · `X` heavy · `R` special.
P2 (PLAY A FRIEND — reconstructed): `←/→` move · `↑` jump · `↓` crouch · hold-back block · `,` punch · `.` kick · `/` heavy · `Shift(R)` special. (Also `U/I/O/P` mirror cluster accepted.)

## Frame data (unit: seconds; distance in world metres)

| Move | Startup | Active | Recovery | Damage | Range | Meter (attacker/victim) | Notes |
|------|---------|--------|----------|--------|-------|--------------------------|-------|
| Punch | 0.035 | 0.10 | 0.075 | 4 | 1.40 | +7.2 / +4.8 | chain → Cross → Hook (0.85 s window) |
| Cross | 0.10 | 0.14 | 0.10 | 5 | 1.45 | +7.2 / +4.8 | chain step 2 |
| Hook | 0.15 | 0.225 | 0.16 | 6 | 1.45 | +7.2 / +4.8 | chain step 3 |
| Kick | 0.12 | 0.26 | 0.26 | 7 | 1.65 | +7.2 / +4.8 | high; knockdown hard; kick-chain 2 s → combo knockdown (throwX 5.5) |
| Heavy = GRAB | 0.14 | 0.18 | 0.40 | 10 | 1.50 | +7.2 / +4.8 | verified: the mobile GRAB button binds to this key; knockdown hard; blockable (20% chip) |
| Sweep (S+kick) | 0.30 | 0.18 | 0.35 | 7 | 1.70 | +7.2 / +4.8 | low; knockdown soft |
| Groin (S+heavy) | 0.12 | 0.26 | 0.30 | 6 | 1.45 | +7.2 / +4.8 | low; knockdown soft |
| Uppercut (S+punch) | 0.20 | 0.12 | 0.40 | 8 | 1.40 | +7.2 / +4.8 | launch 5.5, knockdown hard |
| Special | 0.22 | 0.28 | 0.50 | 20 | 1.90 | costs FULL meter | verified titles/damage/timings (docs/06 §5.3); our cast presentation approximates the verified levitate+beam / ambulance cinematics |

**Verified combat rules now implemented** (docs/06 §5.3): meter attacker +3.6 / victim +1.8 on block; chip = ceil(20%) on every attack; chain damage scaling ×max(.6, 1 − .1·hits) over a 1.4 s window; armor (mid-attack kick/heavy/grab/groin vs dmg ≤ 6 → no reaction); dodge (crouch vs high, airborne vs low); block window = holding away + opponent attacking + dist < 2.6; hitStop .035/.025 (clean/blocked), .09 heavy; whiff extra recovery {punch .06, kick .12, heavy .16, sweep .14, uppercut .16}; stun .32 clean / .12 blocked / .55 heavy; knockdown throwX default 3.2 (heavy reaction 4.5-block push 5); meter gain stops after the special.
**Known presentation gaps (documented, not hidden):** comic damage words (GHE!/DHISHUM!/ZAPAAK! etc.) are canvas sprites in the original — ours shows numeric-free hit feedback only; getup reverse-playback not reproduced (our knockdown uses a timed down state).


- **Block**: hold away from opponent; blocks high+mid; blocked hit ⇒ 0 dmg (chip 1 on heavy/special), blockstun 0.18–0.30s, pushback.
- **Hitstun** 0.28–0.45s scaled by damage; **knockback** 0.8–2.4 m heavy/special; **hit-stop** freeze 60–110 ms for impact feel.
- **Crouch** avoids "high" attacks (kick/special of Ranyalo); crouch-attacking not in faithful edition.
- **Jump**: vy 8.2 m/s, g −22; attacks whiff on airborne target unless timed (landing recovery 0.15).
- **Meter**: 0–100; builds on landed/taken hits (+ block); special consumes all.
- **KO**: health ≤ 0 → knockdown → round end banner → next round or match end. Best-of-3.
- **Timer**: 60 → 0; higher HP % wins round; tie ⇒ draw round (both pip).
- Training mode (`\`): AI idle, no KO, meters pinned full.

## AI (per difficulty)

| Param | EASY | NORMAL | HARD |
|-------|------|--------|------|
| decision interval | 0.55–0.9 s | 0.30–0.55 s | 0.14–0.30 s |
| reaction to attacks (block) | 15% | 40% | 72% |
| aggression | 0.35 | 0.55 | 0.75 |
| anti-air / jump-in | none | rare | yes |
| special usage | rare | when full | when full + baited |
| spacing discipline | poor | decent | good |

Character-specific configs: Kaka (patient, blocks more, keeps mid-range, uses charge special at 3.2m+), Ranyalo (rushdown, more jumps, faster decisions, spin special in-close).

## Camera

- **Game camera** parametrised by View Director: height, distance, width-margin, look-height, side-follow, FOV. Auto-frames both fighters (midpoint + side-follow offset × facing bias; pulls back to keep both inside width margin).
- **Camera Director**: orbit-frozen capture → keyframes `{pos, look, fov, t}` → preview/apply path playback (smooth catmull-rom), Step, Undo, Clear, Copy(JSON), Apply.
- Editor hotkeys: `` ` `` arena panel, `\` training, `Esc` pause.

## Configuration JSON (Export/Apply/Save-Load Local)
```json
{ "version": 1, "stage": "assembly",
  "glbEntries": [{"url|name","pos":[x,y,z],"rot":[x,y,z],"scale":s}],
  "p1Spawn":[x,y,z], "aiSpawn":[x,y,z],
  "view": {"height","distance","widthMargin","lookHeight","sideFollow","fov"},
  "background": {"url"}, "camKeys": [...] }
```
`Show` prints to panel, `Copy` to clipboard, `Save/Load Local` → localStorage, `Apply Text` parses pasted JSON with validation.

## Enhanced edition deltas (kept separate)
Better lighting/shadows/soft particles, extra idle/talk animations, extended combos (chain window 0.35s), per-character finisher camera, announcer + character voice set 2, **best-of-5 option**, training challenge list, hit sparks upgrades, dynamic music layers. Faithful edition stays untouched.
