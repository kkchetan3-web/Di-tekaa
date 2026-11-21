// ai.js — CPU opponent controller
//
// FIDELITY: behaviour model verified from the original bundle (docs/06 §5.4):
// walk when dist > walkDist, ATTACK when dist < attackDist, cadence
// interval[0] + rnd·(interval[1]-interval[0]), weights punch/kick/heavy,
// reactive block (blockReact/frame when opponent attacks within blockRange,
// holds away for blockHold s), special once meter is full after specialHold.
// The original never jumps or crouches; EASY/HARD are our extrapolations.

import { DIFFICULTY } from './config.js';

export class AIController {
  constructor(fighter, difficulty = 'normal') {
    this.f = fighter;
    this.setDifficulty(difficulty);
    this.timer = 0;            // counts up (original semantics)
    this.nextAttackAt = 0.6;   // first attack gate
    this.blockT = 0;
    this.fullSince = null;     // when meter became full
    this.fullDelay = 0;
    this.input = { left: false, right: false, up: false, down: false, punchP: false, kickP: false, heavyP: false, specialP: false, tauntP: false };
    this.decisions = 0;        // instrumentation for headless tests
  }

  setDifficulty(d) {
    this.d = DIFFICULTY[d] || DIFFICULTY.normal;
    this.name = d;
    this.timer = 0;
    this.nextAttackAt = 0.6;
    this.fullSince = null;
  }

  _press(k) { this.input[k + 'P'] = true; }

  update(dt, opp, game) {
    const f = this.f;
    const inp = this.input;
    for (const k of ['left', 'right', 'up', 'down']) inp[k] = false;
    inp.punchP = inp.kickP = inp.heavyP = inp.specialP = inp.tauntP = false;
    if (!opp || f.state === 'ko' || f.state === 'win' || f.state === 'lose' || f.state === 'intro') return inp;
    if (f.dummy) return inp;

    this.timer += dt;
    const D = this.d;
    const dist = Math.abs(opp.x - f.x);

    // training mode: original clears AI input every frame (AI stands still)
    if (game && game.training) return inp;

    // reactive blocking: opponent attacking nearby -> hold away briefly
    if (opp.state === 'attack' && dist < D.blockRange && Math.random() < D.blockReact) {
      this.blockT = D.blockHold;
    }
    this.blockT = Math.max(0, this.blockT - dt);
    if (this.blockT > 0 && f.grounded && !f.busy) {
      if (opp.x > f.x) inp.left = true; else inp.right = true;
      return inp;
    }

    if (f.grounded === false) return inp;

    // walk toward when out of walk range
    if (dist > D.walkDist) {
      if (opp.x > f.x) inp.right = true; else inp.left = true;
    }

    // attack gate
    if (dist < D.attackDist && this.timer >= this.nextAttackAt) {
      const meterFull = f.meter >= 100 && !f.specialUsed;
      if (meterFull) {
        if (this.fullSince == null) {
          this.fullSince = this.timer;
          this.fullDelay = D.specialHold[0] + Math.random() * (D.specialHold[1] - D.specialHold[0]);
        }
        if (this.timer - this.fullSince >= this.fullDelay) {
          this._press('special');
          this.nextAttackAt = this.timer + D.interval[0] + Math.random() * (D.interval[1] - D.interval[0]);
          this.decisions++;
          return inp;
        }
        // hold back while charging the special decision (original walks meanwhile)
        return inp;
      }
      this.fullSince = null;
      const r = Math.random();
      const w = D.weights;
      if (r < w[0]) this._press('punch');
      else if (r < w[0] + w[1]) this._press('kick');
      else this._press('heavy');
      this.nextAttackAt = this.timer + D.interval[0] + Math.random() * (D.interval[1] - D.interval[0]);
      this.decisions++;
    }
    return inp;
  }
}
