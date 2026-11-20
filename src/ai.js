// ai.js — CPU opponent controller (reactive state machine, per-character configs)

import { DIFFICULTY } from './config.js';

export class AIController {
  constructor(fighter, difficulty = 'normal') {
    this.f = fighter;
    this.setDifficulty(difficulty);
    this.timer = 0;
    this.input = { left: false, right: false, up: false, down: false, punchP: false, kickP: false, heavyP: false, specialP: false, tauntP: false };
    this.plan = null;      // {type:'approach'|'retreat'|'attack'|'block'|'jump'|'idle', t}
    this.blockT = 0;
  }

  setDifficulty(d) {
    this.d = DIFFICULTY[d] || DIFFICULTY.normal;
    this.name = d;
    this.timer = 0;
  }

  _press(k) { this.input[k + 'P'] = true; }

  update(dt, opp, game) {
    const f = this.f;
    const inp = this.input;
    for (const k of ['left', 'right', 'up', 'down']) inp[k] = false;
    inp.punchP = inp.kickP = inp.heavyP = inp.specialP = inp.tauntP = false;
    if (!opp || f.state === 'ko' || f.state === 'win' || f.state === 'lose' || f.state === 'intro') return inp;
    if (f.dummy) return inp;

    const dist = Math.abs(opp.x - f.x);
    const cfg = f.def.ai;
    const D = this.d;

    // reactive blocking: opponent attacking nearby
    if (opp.state === 'attack' && dist < 2.6 && Math.random() < D.reaction * dt * 12) {
      this.blockT = 0.35 + Math.random() * 0.3;
    }
    this.blockT = Math.max(0, this.blockT - dt);
    if (this.blockT > 0 && f.grounded && !f.busy) {
      if (opp.x > f.x) inp.left = true; else inp.right = true;
      return inp;
    }

    // anti-air
    if (!f.grounded) return inp;
    if (opp.y > 0.4 && dist < 2.2 && Math.random() < D.antiAir * dt * 10) {
      this._press(Math.random() < 0.5 ? 'punch' : 'kick');
      return inp;
    }

    this.timer -= dt;
    if (this.timer > 0) {
      // continue current plan
      if (this.plan) {
        switch (this.plan.type) {
          case 'approach': if (opp.x > f.x) inp.right = true; else inp.left = true; break;
          case 'retreat': if (opp.x > f.x) inp.left = true; else inp.right = true; break;
          case 'crouch': inp.down = true; break;
          case 'jump': inp.up = this.plan.fresh ? true : false; this.plan.fresh = false; break;
        }
      }
      return inp;
    }

    // new decision
    const [lo, hi] = D.interval;
    this.timer = lo + Math.random() * (hi - lo);
    const r = Math.random();
    const aggr = D.aggression * (cfg.aggression ? cfg.aggression / 0.55 : 1);

    // special logic
    if (f.meter >= 100 && dist < cfg.specialAt + 0.8 && r < D.specialUse) {
      this._press('special');
      return inp;
    }

    // spacing personality
    const wantDist = cfg.spacing === 'close' ? 1.2 : cfg.spacing === 'mid' ? 1.9 : 2.4;

    if (dist > wantDist + 1.6) {
      // approach (or bait with taunt on easy when far)
      if (Math.random() < 0.06 && game.allowTaunts) { inp.tauntP = true; return inp; }
      this.plan = { type: 'approach' };
      if (opp.x > f.x) inp.right = true; else inp.left = true;
      return inp;
    }
    if (dist > wantDist + 0.2) {
      if (r < aggr) { // dash in with attack
        this.plan = { type: 'approach' };
        if (opp.x > f.x) inp.right = true; else inp.left = true;
        this.timer *= 0.5;
      } else if (r < aggr + 0.2 && Math.random() < 0.4) {
        this.plan = { type: 'jump', fresh: true }; inp.up = true;
      } else {
        this.plan = { type: 'approach' };
        if (opp.x > f.x) inp.right = true; else inp.left = true;
      }
      return inp;
    }
    // in range
    if (r < aggr) {
      const roll = Math.random();
      if (dist > wantDist + 0.6 && roll < 0.5) this._press('kick');
      else if (roll < 0.6) this._press('punch');
      else if (roll < 0.8) this._press('heavy');
      else this._press('kick');
    } else if (r < aggr + D.blockBias) {
      this.blockT = 0.4 + Math.random() * 0.4;
    } else if (r < aggr + D.blockBias + 0.15) {
      this.plan = { type: 'retreat' };
      if (opp.x > f.x) inp.left = true; else inp.right = true;
    } else {
      inp.down = true;
      this.plan = { type: 'crouch' };
    }
    return inp;
  }
}
