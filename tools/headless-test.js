// tools/headless-test.js — headless QA harness: runs combat/AI/animation/arenas without a browser.
// Usage: node tools/headless-test.js

// ---- minimal DOM stubs -------------------------------------------------------
const fakeCtx2d = new Proxy({}, { get: (t, k) => (k === 'canvas' ? {} : () => {}) });
globalThis.document = {
  createElement(tag) {
    if (tag === 'canvas') return { width: 0, height: 0, getContext: () => fakeCtx2d, toDataURL: () => 'data:,' };
    return { style: {}, classList: { add() {}, remove() {}, toggle() {} }, addEventListener() {}, appendChild() {}, set innerHTML(v) {}, get innerHTML() { return ''; }, set textContent(v) {}, get textContent() { return ''; }, querySelector: () => null, querySelectorAll: () => [] };
  },
  querySelector: () => null,
  querySelectorAll: () => [],
  getElementById: () => null,
  readyState: 'complete',
  addEventListener() {},
  fullscreenElement: null,
};
globalThis.window = globalThis;
Object.defineProperty(globalThis, 'navigator', { value: { clipboard: { writeText: async () => {} } }, configurable: true });
globalThis.localStorage = { getItem: () => null, setItem() {} };
globalThis.requestAnimationFrame = () => 0;
globalThis.devicePixelRatio = 1;
globalThis.innerWidth = 1280; globalThis.innerHeight = 720;
globalThis.performance = globalThis.performance || { now: () => Date.now() };

// fake AudioContext
class FakeParam { constructor(v = 0) { this.value = v; } setValueAtTime() {} linearRampToValueAtTime() {} exponentialRampToValueAtTime() {} }
class FakeNode { constructor() { this.gain = new FakeParam(1); this.frequency = new FakeParam(800); this.Q = new FakeParam(1); this.type = ''; this.playbackRate = new FakeParam(1); this.buffer = null; this.loop = false; } connect(x) { return x; } start() {} stop() {} disconnect() {} }
globalThis.AudioContext = class {
  constructor() { this.currentTime = 0; this.sampleRate = 44100; this.state = 'running'; this.destination = new FakeNode(); }
  resume() {} decodeAudioData() { return Promise.resolve(new FakeNode()); }
  createGain() { return new FakeNode(); } createBiquadFilter() { return new FakeNode(); }
  createBufferSource() { return new FakeNode(); } createOscillator() { return new FakeNode(); }
  createBuffer(ch, len) { return { getChannelData: () => new Float32Array(len) }; }
};

// ---- imports ------------------------------------------------------------------
const { Fighter, Effects } = await import('../src/combat.js');
const { AIController } = await import('../src/ai.js');
const { Animator, CLIPS } = await import('../src/animator.js');
const { FighterModel, CHARACTER_BUILDERS } = await import('../src/characters.js');
const { ArenaManager } = await import('../src/arenas.js');
const { ROSTER, KEYMAP_P1, KEYMAP_P2 } = await import('../src/config.js');
import * as THREE from 'three';

let pass = 0, fail = 0;
const ok = (cond, name) => { if (cond) { pass++; console.log('  ✔', name); } else { fail++; console.log('  ✘ FAIL:', name); } };

// fake game host for fighters
function makeFakeGame() {
  const scene = new THREE.Scene();
  return {
    scene, THREE,
    effects: new Effects(scene),
    hitStop: 0,
    fightCam: { shake: 0 },
    ui: { flashBar() {}, flashBlock() {}, comboPop() {}, specialCinematic() {}, toast() {} },
    allowTaunts: true,
    stats: { hits: [0, 0], dmg: [0, 0] },
    koCount: 0,
    onKO() { this.koCount++; },
    timeScale: 1,
    roundPhase: 'fight',
    training: false,
    edition: 'faithful',
  };
}

// ==== 1. Character builds ======================================================
console.log('\n[1] Character construction');
const models = {};
for (const c of ROSTER) {
  try {
    const m = new FighterModel(c.id);
    models[c.id] = m;
    ok(!!m.group && !!m.j.hips && !!m.j.armR && !!m.j.head, `build ${c.id} (rig complete)`);
    m.setMood('angry'); m.setMood('ko'); m.lieFlat(true); m.lieFlat(false);
    ok(true, `${c.id} moods + lieFlat`);
  } catch (e) { ok(false, `build ${c.id}: ${e.message}`); }
}

// ==== 2. Every animation clip runs cleanly =====================================
console.log('\n[2] Animation clips');
for (const c of ROSTER) {
  let err = null;
  try {
    const m = new FighterModel(c.id);
    const a = new Animator(m);
    for (const name of Object.keys(CLIPS)) {
      a.play(name);
      for (let i = 0; i < 120; i++) a.update(1 / 60);
    }
  } catch (e) { err = e; }
  ok(!err, `${c.id}: all ${Object.keys(CLIPS).length} clips × 2s — ${err ? err.message : 'clean'}`);
}

// ==== 3. Arenas build + update ==================================================
console.log('\n[3] Arenas');
{
  const scene = new THREE.Scene();
  const am = new ArenaManager(scene);
  for (const id of ['assembly', 'path', 'miramar']) {
    try {
      const st = am.loadStage(id);
      am.update(1 / 60, 1.5);
      ok(!!st.group && st.group.children.length > 5, `arena ${id} (${st.group.children.length} nodes)`);
    } catch (e) { ok(false, `arena ${id}: ${e.message}`); }
  }
  am.setBackground(null);
  ok(true, 'background clear');
}

// ==== 4. AI vs AI full match ====================================================
console.log('\n[4] AI vs AI simulation (kaka vs por, normal, 60s)');
{
  const game = makeFakeGame();
  const p1 = new Fighter('kaka', 1, game.scene, game);
  const p2 = new Fighter('por', -1, game.scene, game);
  p1.opponent = p2; p2.opponent = p1;
  const ai1 = new AIController(p1, 'normal');
  const ai2 = new AIController(p2, 'hard');
  let err = null, koSeen = false, damageSeen = false;
  const dt = 1 / 60;
  try {
    for (let frame = 0; frame < 60 * 120; frame++) {
      const i1 = ai1.update(dt, p2, game);
      const i2 = ai2.update(dt, p1, game);
      p1.update(dt, i1, p2);
      p2.update(dt, i2, p1);
      game.effects.update(dt);
      if (p1.health < p1.maxHealth || p2.health < p2.maxHealth) damageSeen = true;
      if (game.koCount > 0) { koSeen = true; break; }
      if (!isFinite(p1.x) || !isFinite(p2.x) || isNaN(p1.health)) { err = new Error('NaN detected'); break; }
    }
  } catch (e) { err = e; }
  ok(!err, `sim ran clean${err ? ' — ' + err.message : ''}`);
  ok(damageSeen, `damage dealt (hp ${p1.health.toFixed(0)}/${p2.health.toFixed(0)})`);
  ok(koSeen, 'KO reachable');
  ok(p1.x >= -9.6 && p1.x <= 9.6 && p2.x >= -9.6 && p2.x <= 9.6, 'stage bounds respected');
}

// ==== 5. Blocking + special mechanics ============================================
console.log('\n[5] Mechanics');
{
  const game = makeFakeGame();
  const p1 = new Fighter('kaka', 1, game.scene, game);
  const p2 = new Fighter('por', -1, game.scene, game);
  p1.opponent = p2; p2.opponent = p1;
  // blocking: p2 holds back
  const dt = 1 / 60;
  const hpBefore = p2.health;
  for (let i = 0; i < 30; i++) p2.update(dt, { left: true, right: false, punchP: false, kickP: false, heavyP: false, specialP: false, up: false, down: false }, p1);
  ok(p2.state === 'block' || p2.state === 'walk', `hold-back state (${p2.state})`);
  p1.startMove('punch');
  ok(p1.state === 'attack', 'punch starts');
  let hitFrames = 0;
  for (let i = 0; i < 40 && p1.state === 'attack'; i++) {
    p2.update(dt, { left: true, punchP: false, kickP: false, heavyP: false, specialP: false, up: false, down: false }, p1);
    p1.update(dt, { left: false, right: false, punchP: false, kickP: false, heavyP: false, specialP: false, up: false, down: false }, p2);
    hitFrames++;
  }
  ok(p2.health === hpBefore - 0, `blocked jab deals no HP loss (${hpBefore}→${p2.health})`);
  // verified: grab (=heavy) vs a blocking opponent lands the ceil(20%) chip (docs/06 §5.3)
  p1.reset(0); p2.reset(1.0);
  p1.meter = 0;
  for (let i = 0; i < 30; i++) p2.update(dt, { left: true, punchP: false, kickP: false, grabP: false, heavyP: false, specialP: false, up: false, down: false }, p1);
  const hpBeforeGrab = p2.health;
  p1.startMove('grab');
  for (let i = 0; i < 50 && p1.state === 'attack'; i++) {
    p2.update(dt, { left: true, punchP: false, kickP: false, grabP: false, heavyP: false, specialP: false, up: false, down: false }, p1);
    p1.update(dt, { left: false, right: false, punchP: false, kickP: false, grabP: false, heavyP: false, specialP: false, up: false, down: false }, p2);
  }
  ok(p2.health < hpBeforeGrab, `grab chips a blocking opponent (${hpBeforeGrab}→${p2.health})`);
  // meter + special
  p1.meter = 100;
  p1.startMove('special');
  ok(p1.state === 'attack' && p1.meter === 0, 'special consumes meter');
  const x0 = p1.x;
  for (let i = 0; i < 30; i++) { p1.update(dt, null, p2); p2.update(dt, null, p1); }
  ok(p1.x !== x0, `charge special moves fighter (${x0.toFixed(2)}→${p1.x.toFixed(2)})`);
}

// ==== 6. Difficulty configs =====================================================
console.log('\n[6] AI difficulty');
{
  const game = makeFakeGame();
  const p1 = new Fighter('por', -1, game.scene, game);
  const p2 = new Fighter('kaka', 1, game.scene, game);
  p1.opponent = p2; p2.opponent = p1;
  let movesEasy = 0, movesHard = 0;
  const dt = 1 / 60;
  // Measure pure decision frequency at fixed in-range distance (no movement dynamics,
  // large sample) — robust against stochastic movement flakes.
  for (const [diff, store] of [['easy', (v) => movesEasy = v], ['hard', (v) => movesHard = v]]) {
    const ai = new AIController(p1, diff);
    let actions = 0;
    p1.reset(0); p2.reset(1.2); // fixed in-range positions (< verified attackDist 1.45); fighters never update
    for (let f = 0; f < 60 * 30; f++) {
      const inp = ai.update(dt, p2, game);
      if (inp.punchP || inp.kickP || inp.heavyP || inp.specialP) actions++;
    }
    store(actions);
  }
  ok(movesHard > movesEasy, `hard aggression > easy (${movesHard} vs ${movesEasy} attack decisions/30s)`);
}

console.log(`\n===== ${pass} passed, ${fail} failed =====`);
process.exit(fail ? 1 : 0);
