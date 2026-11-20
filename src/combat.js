// combat.js — Fighter state machine, hit detection, particle effects

import * as THREE from 'three';
import { FighterModel } from './characters.js';
import { Animator } from './animator.js';
import { audio } from './audio.js';
import { STAGE_MIN_X, STAGE_MAX_X, ROSTER } from './config.js';

const GRAVITY = 22;

// ---------------------------------------------------------------------------
// Effects — hit sparks, dust puffs (original procedural visuals)
// ---------------------------------------------------------------------------
export class Effects {
  constructor(scene) {
    this.scene = scene;
    this.parts = [];
    this.pool = [];
  }
  _get() {
    let m = this.pool.pop();
    if (!m) {
      m = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.07), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true }));
    }
    return m;
  }
  burst(pos, color = 0xffd24a, count = 12, speed = 4, up = 2.4) {
    for (let i = 0; i < count; i++) {
      const m = this._get();
      m.material.color.set(color);
      m.material.opacity = 1;
      m.position.copy(pos);
      m.scale.setScalar(0.7 + Math.random() * 0.9);
      this.scene.add(m);
      this.parts.push({
        m,
        vel: new THREE.Vector3((Math.random() - 0.5) * speed, Math.random() * up, (Math.random() - 0.5) * speed * 0.6),
        life: 0.5 + Math.random() * 0.25,
      });
    }
  }
  ring(pos, color = 0xff7043) {
    this.burst(pos, color, 18, 6, 3.4);
    this.burst(pos, 0xffffff, 8, 3, 2);
  }
  dust(pos) { this.burst(new THREE.Vector3(pos.x, 0.1, pos.z), 0xbbaa88, 8, 2.2, 1.2); }
  update(dt) {
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.life -= dt;
      if (p.life <= 0) { this.scene.remove(p.m); this.pool.push(p.m); this.parts.splice(i, 1); continue; }
      p.vel.y -= 9 * dt;
      p.m.position.addScaledVector(p.vel, dt);
      p.m.material.opacity = Math.min(1, p.life * 2.2);
    }
  }
}

// ---------------------------------------------------------------------------
export class Fighter {
  constructor(charId, side, scene, game) {
    this.charId = charId;
    this.def = ROSTER.find(r => r.id === charId);
    this.side = side;               // 1 = P1 (starts left), -1 = AI/P2
    this.game = game;
    this.model = new FighterModel(charId);
    this.animator = new Animator(this.model);
    scene.add(this.model.group);
    this.input = null;
    this.opponent = null;
    this.reset(side === 1 ? -2.6 : 2.6);
    this.health = this.def.stats.health;
    this.maxHealth = this.def.stats.health;
    this.meter = 0;
    this.roundsWon = 0;
    this.dummy = false;             // training-mode dummy
  }

  reset(x) {
    this.x = x; this.y = 0; this.z = 0;
    this.velX = 0; this.velY = 0;
    this.state = 'idle';
    this.stunT = 0; this.downT = 0; this.attackT = 0; this.attackMove = null; this.attackHasHit = false;
    this.comboNext = null; this.comboWindow = 0; this.chainCount = 0;
    this.blockHoldT = 0; this.airFrom = null;
    this.model.lieFlat(false);
    this.model.setMood('neutral');
    this.animator.play('idle');
  }

  get grounded() { return this.y <= 0.001; }
  get busy() { return ['attack', 'hit', 'down', 'ko'].includes(this.state); }
  get holdingBack() { // holding direction away from opponent
    if (!this.input || !this.opponent) return false;
    const away = this.opponent.x > this.x ? 'left' : 'right';
    return this.input[away];
  }
  get blocking() { return this.grounded && this.holdingBack && !this.busy && this.state !== 'crouch'; }
  get crouching() { return this.state === 'crouch'; }

  startMove(name) {
    const mv = this.def.moves[name];
    this.attackMove = { ...mv, name };
    this.attackT = 0;
    this.attackHasHit = false;
    this.state = 'attack';
    audio.whoosh();
    if (name === 'special') {
      this.meter = 0;
      audio.special();
      const clip = this.charId === 'kaka' ? 'specialKaka' : 'specialPor';
      this.animator.play(clip);
      this.game.effects.ring(new THREE.Vector3(this.x, 1, this.z), this.charId === 'kaka' ? 0xff7733 : 0xdd3344);
    } else {
      this.animator.play(name === 'punch' && this.chainCount % 2 === 1 ? 'punch2' : name);
    }
    if (name === 'special') this.shout('special');
  }

  shout(kind) {
    // character voice clips (parody audio, generated) — optional files
    const ids = { special: `${this.charId}_special`, taunt: `${this.charId}_taunt`, win: `${this.charId}_win`, lose: `${this.charId}_lose`, intro: `${this.charId}_intro` };
    if (ids[kind]) audio.playClip(ids[kind], { gain: 0.9 });
  }

  update(dt, input, opp) {
    this.input = input;
    this.opponent = opp;
    this.comboWindow = Math.max(0, this.comboWindow - dt);

    // knockdown / KO airborne arc
    if (!this.grounded) {
      this.velY -= GRAVITY * dt;
      this.y += this.velY * dt;
      if (this.y <= 0) {
        this.y = 0; this.velY = 0;
        if (this.state === 'jump') { this.state = 'idle'; audio.land(); this.game.effects.dust(new THREE.Vector3(this.x, 0, this.z)); }
        else if (this.state === 'down' || this.state === 'ko') {
          this.game.effects.dust(new THREE.Vector3(this.x, 0, this.z));
          this.model.lieFlat(this.state === 'ko' || this.downT > 0.15);
        }
      }
    }

    switch (this.state) {
      case 'hit': {
        this.stunT -= dt;
        this.x += this.velX * dt; this.velX *= Math.pow(0.02, dt);
        if (this.grounded && this.stunT <= 0) { this.state = 'idle'; this.model.setMood('neutral'); }
        break;
      }
      case 'down': {
        this.downT -= dt;
        this.x += this.velX * dt; this.velX *= Math.pow(0.05, dt);
        if (this.downT <= 0 && this.grounded) {
          this.model.lieFlat(false);
          this.state = 'idle'; this.model.setMood('neutral');
          this.animator.play('idle');
        }
        break;
      }
      case 'ko': {
        this.x += this.velX * dt; this.velX *= Math.pow(0.05, dt);
        break;
      }
      case 'attack': {
        this.attackT += dt;
        const mv = this.attackMove;
        const t = this.attackT;
        const activeStart = mv.startup, activeEnd = mv.startup + mv.active, total = mv.startup + mv.active + mv.recovery;
        // special motions move the fighter
        if (mv.motion === 'charge' && t > mv.startup * 0.5 && t < activeEnd) {
          const dir = Math.sign(opp.x - this.x) || 1;
          this.x += dir * 5.2 * dt;
        }
        if (mv.motion === 'spin' && t > mv.startup * 0.5 && t < activeEnd) {
          const dir = Math.sign(opp.x - this.x) || 1;
          this.x += dir * 1.8 * dt;
        }
        if (!this.attackHasHit && t >= activeStart && t < activeEnd) this.tryHit(opp, mv);
        if (t >= total) {
          this.state = 'idle';
          this.attackMove = null;
        }
        break;
      }
      case 'jump': break; // airborne handled above
      case 'taunt': {
        this.tauntT -= dt;
        if (this.tauntT <= 0) this.state = 'idle';
        break;
      }
      case 'win': case 'lose': case 'intro': break;
      default: {
        // ground control
        if (this.dummy) { this.state = 'idle'; break; }
        const dir = opp.x > this.x ? 1 : -1; // facing dir toward opponent
        const back = dir > 0 ? 'left' : 'right';
        const fwd = dir > 0 ? 'right' : 'left';

        if (input && input.up && this.grounded) {
          this.state = 'jump'; this.velY = this.def.stats.jump;
          audio.jump();
        } else if (input && input.down) {
          this.state = 'crouch';
        } else if (input && input[back] && this.blockingOppApproach(opp)) {
          this.state = 'block';
        } else if (input && input[back]) {
          this.state = 'walk'; this.x -= dir * this.def.stats.walkBack * dt; this.blockHoldT = 0.16;
        } else if (input && input[fwd]) {
          this.state = 'walk'; this.x += dir * this.def.stats.walk * dt; this.blockHoldT = 0;
        } else {
          this.state = 'idle';
        }
        this.blockHoldT = Math.max(0, this.blockHoldT - dt);

        // attack initiations
        if (this.grounded && input) {
          if (input.punchP) this.queueAttack('punch');
          else if (input.kickP) this.queueAttack('kick');
          else if (input.heavyP) this.queueAttack('heavy');
          else if (input.specialP && this.meter >= 100) this.queueAttack('special');
          else if (input.tauntP && this.game && this.game.allowTaunts) this.doTaunt();
        }
        break;
      }
    }

    // combo chaining: pressing punch during recovery queues next jab
    if (this.state === 'attack' && this.attackMove && this.attackMove.name === 'punch' && input && input.punchP && this.attackT > this.attackMove.startup + this.attackMove.active) {
      this.comboNext = 'punch'; this.comboWindow = 0.3;
    }
    if (this.state === 'idle' && this.comboNext && this.comboWindow > 0 && this.chainCount < 3) {
      this.chainCount++;
      const n = this.comboNext; this.comboNext = null;
      this.queueAttack(n);
      if (this.chainCount >= 3) this.chainCount = 0;
    }
    if (this.state === 'idle' && !this.comboNext) this.chainCount = 0;

    // clamp to stage
    this.x = THREE.MathUtils.clamp(this.x, STAGE_MIN_X, STAGE_MAX_X);

    // model sync
    const m = this.model;
    m.group.position.set(this.x, this.y, this.z);
    m.baseRotY = (this.opponent && this.opponent.x < this.x) ? -Math.PI / 2 : Math.PI / 2;
    if (!m.spinY) m.group.rotation.y = m.baseRotY;
    m.group.scale.setScalar(this.def.stats.scale);
    this.syncAnimation();
    this.animator.update(dt);
  }

  blockingOppApproach(opp) {
    // show block pose while opponent is attacking or just finished
    return opp && (opp.state === 'attack' || opp.blockHoldT > 0 || opp.state === 'down');
  }

  queueAttack(name) {
    if (name === 'special' && this.meter < 100) { return; }
    this.startMove(name);
  }

  doTaunt() {
    if (this.state !== 'idle' || !this.grounded) return;
    this.state = 'taunt';
    this.tauntT = this.charId === 'kaka' ? 1.5 : 1.1;
    this.animator.play(this.charId === 'kaka' ? 'tauntKaka' : 'tauntPor');
    this.shout('taunt');
    audio.tauntBark();
  }

  syncAnimation() {
    const a = this.animator;
    switch (this.state) {
      case 'attack': break; // clip already playing from startMove
      case 'hit': if (a.name !== 'hit') a.play('hit'); break;
      case 'down': case 'ko': if (a.name !== 'ko') a.play('ko'); break;
      case 'jump': if (this.velY > 1) a.play('jump'); else a.play('fall'); break;
      case 'crouch': a.play('crouch'); break;
      case 'block': a.play('block'); break;
      case 'walk': a.play(this.holdingBack ? 'walkB' : 'walkF'); break;
      case 'taunt': break;
      case 'win': a.play(this.charId === 'kaka' ? 'winKaka' : 'winPor'); break;
      case 'lose': a.play('lose'); break;
      case 'intro': a.play(this.charId === 'kaka' ? 'introKaka' : 'introPor'); break;
      default: if (['idle', 'walk', 'crouch', 'block', 'jump'].includes(a.name) || a.name === null || a.done) a.play('idle'); break;
    }
  }

  tryHit(opp, mv) {
    if (!opp || opp.state === 'ko' || opp.state === 'down') return;
    const dist = Math.abs(opp.x - this.x);
    const reach = mv.range + 0.35;
    if (dist > reach) return;
    if (opp.y > 1.15) return;                    // jumped over it
    if (opp.crouching && mv.height === 'high') return;  // ducked it
    this.attackHasHit = true;
    opp.receiveHit(mv, this, this.game);
  }

  receiveHit(mv, attacker, game) {
    const dir = Math.sign(this.x - attacker.x) || attacker.side;
    if (this.blocking || (this.grounded && this.holdingBack && !this.busy)) {
      // BLOCKED
      const chip = (mv.name === 'heavy' || mv.name === 'special') ? Math.max(1, Math.round(mv.dmg * 0.1)) : 0;
      this.health = Math.max(0, this.health - chip);
      this.stunT = mv.name === 'special' ? 0.3 : 0.2;
      this.state = this.state === 'crouch' ? 'crouch' : 'block';
      this.velX = dir * 2.4; this.x += this.velX * 0.06;
      attacker.velX = -dir * 1.2;
      game.hitStop = 0.05;
      game.effects.burst(new THREE.Vector3((this.x + attacker.x) / 2, 1.15 + (this.y || 0), 0), 0x6ab0ff, 8, 3);
      audio.block();
      this.meter = Math.min(100, this.meter + 8);
      game.ui.flashBlock(this.side);
      return;
    }
    // CLEAN HIT
    const dmg = mv.dmg;
    this.health = Math.max(0, this.health - dmg);
    if (attacker.game && attacker.game.stats) {
      const idx = attacker.side === 1 ? 0 : 1;
      attacker.game.stats.hits[idx]++;
      attacker.game.stats.dmg[idx] += this.blocking ? 0 : dmg;
    }
    this.model.setMood('hurt');
    attacker.meter = Math.min(100, attacker.meter + mv.meter);
    this.meter = Math.min(100, this.meter + mv.meterTake);
    if (attacker.meter >= 100 && attacker.meterPrev < 100) audio.meterFull();
    attacker.meterPrev = attacker.meter;

    const kb = mv.kb || 0.8 + dmg * 0.05;
    this.velX = dir * kb;
    const heavy = mv.name === 'heavy' || mv.name === 'special';
    if (heavy) { this.velY = 4.2; this.state = 'down'; this.downT = 1.1; this.y = Math.max(this.y, 0.01); }
    else { this.state = 'hit'; this.stunT = 0.24 + dmg * 0.012; }

    game.hitStop = heavy ? 0.11 : 0.06;
    game.fightCam.shake = heavy ? 1.2 : 0.5;
    const hitPos = new THREE.Vector3((this.x + attacker.x) / 2 + dir * 0.2, 1.2 + (this.y || 0), 0);
    game.effects.burst(hitPos, heavy ? 0xff5533 : 0xffd24a, heavy ? 16 : 10, heavy ? 6 : 4);
    if (heavy) game.effects.ring(hitPos, 0xff9944);
    if (heavy) audio.heavy(); else audio.punch();
    audio.hit();

    game.ui.comboPop(attacker);
    if (this.health <= 0) this.knockOut(game);
  }

  knockOut(game) {
    this.state = 'ko';
    this.velY = 5;
    this.velX = Math.sign(this.x - (this.opponent ? this.opponent.x : this.x)) * 2.4;
    this.model.setMood('ko');
    audio.ko();
    game.onKO(this);
  }
}
