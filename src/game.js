// game.js — orchestrator: verified boot → landing → fight flow (docs/06)

import * as THREE from 'three';
import { audio } from './audio.js';
import { ArenaManager } from './arenas.js';
import { FightCamera, CameraDirector } from './camera.js';
import { Fighter, Effects } from './combat.js';
import { AIController } from './ai.js';
import { ArenaEditor } from './editor.js';
import { UI } from './ui.js';
import { ROSTER, STAGES, ROUND_TIME, KEYMAP_P1, KEYMAP_P2, EDITION, VERSION } from './config.js';

const $ = (id) => document.getElementById(id);

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.edition = EDITION;
    this.roster = ROSTER;
    this.state = 'loading';
    this.THREE = THREE;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
    this.camera.position.set(0, 2.3, 6.2);

    this.fightCam = new FightCamera(this.camera);
    this.camDirector = new CameraDirector(this.camera, this.fightCam);
    this.arena = new ArenaManager(this.scene);
    this.effects = new Effects(this.scene);
    this.ui = new UI(this);
    this.editor = new ArenaEditor(this.arena, this);

    // fight state
    this.fighters = [null, null];
    this.ai = null;
    this.mode = 'cpu';
    this.difficulty = 'normal';
    this.stageId = 'assembly';
    this.spawnP1 = null; this.spawnAI = null;
    this.pickP1 = 'kaka'; this.pickP2 = 'por';
    this.fightersReady = false;
    this.training = false;
    this.allowTaunts = true;
    this.round = 1;
    this.roundsToWin = 2;
    this.timer = ROUND_TIME;
    this.roundPhase = 'intro';
    this.phaseT = 0;
    this.hitStop = 0;
    this.timeScale = 1;
    this.backgroundURL = null;
    this.stats = { hits: [0, 0], dmg: [0, 0] };

    // touch input (verified layout: stick + PUNCH/KICK/GRAB/SUPER)
    this.touchInput = { left: false, right: false, up: false, down: false, punchP: false, kickP: false, grabP: false, specialP: false };
    this._tauntQueued = false;

    // keyboard
    this.keys = new Set();
    window.addEventListener('keydown', (e) => { this.keys.add(e.code); if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault(); });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));

    this.clock = new THREE.Clock();
    this.audio = audio;
    audio.volume = 0.9;
    this.ui.bindAll();
    this.camDirector.attachDrag(canvas);
    this.editor.attachDrag(canvas);
    this.editor.visible = document.body.classList.contains('arena-open');

    window.addEventListener('resize', () => this.resize());
    this.resize();

    // verified boot flow: loadScreen → boot (arena choice + PLAY) → landing
    this.arena.loadStage('assembly');
    this.ui.showBoot();
    this.buildPortraits().then(() => {
      this.fightersReady = true;
      this.ui.setBootReady(true);
      this.ui.showBoot();
      this.ui.setBootArena(this.stageId);
      $('ldVersion').textContent = VERSION;
      this.ui.syncLanding();
    });
    audio.loadManifest();
    this.loop();
  }

  resize() {
    const w = innerWidth, h = innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  // ---- procedural portraits (original artwork) --------------------------------
  async buildPortraits() {
    const { FighterModel } = await import('./characters.js');
    const urls = {};
    for (const c of this.roster) {
      const s = new THREE.Scene();
      s.background = new THREE.Color(0x0d3a37);
      const key = new THREE.DirectionalLight(0xffffff, 2.4); key.position.set(2, 3, 4); s.add(key);
      s.add(new THREE.HemisphereLight(0x9be7ff, 0x061e1e, 1.2));
      const model = new FighterModel(c.id);
      model.setMood(c.id === 'por' ? 'angry' : 'neutral');
      model.group.position.set(0, -0.35, 0);
      model.group.rotation.y = 0.35;
      s.add(model.group);
      const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 10);
      cam.position.set(0, 1.35, 2.6);
      cam.lookAt(0, 0.85, 0);
      this.renderer.setSize(256, 256, false);
      this.renderer.render(s, cam);
      urls[c.id] = this.canvas.toDataURL('image/png');
      this.resize();
    }
    // landing cards
    document.querySelectorAll('.ld-card[data-id]').forEach(card => {
      const img = card.querySelector('img');
      if (img && urls[card.dataset.id]) img.src = urls[card.dataset.id];
    });
    // HUD portraits (verified: hidden until set)
    this.ui.setPortraits(urls[this.pickP1], urls[this.pickP2]);
    this._portraits = urls;
    if ($('ldDevAvatar')) $('ldDevAvatar').src = urls['kaka'];
  }

  fightersMidpoint() {
    if (!this.fighters[0] || !this.fighters[1]) return new THREE.Vector3(0, 1, 0);
    return new THREE.Vector3((this.fighters[0].x + this.fighters[1].x) / 2, 1, 0);
  }

  // ---- flow ---------------------------------------------------------------------
  pickFighter(id) {
    if (this.ui.pickingSlot === 'p1') {
      this.pickP1 = id;
      this.ui.pickingSlot = 'cpu';
    } else {
      this.pickP2 = id;
      this.ui.pickingSlot = 'p1';
    }
    if (this._portraits) this.ui.setPortraits(this._portraits[this.pickP1], this._portraits[this.pickP2]);
    this.ui.syncLanding();
    const r = this.roster.find(r => r.id === id);
    if (r) this.ui.toast(r.name + ' — ' + r.tagline);
  }

  startFight(mode) {
    this.mode = mode;
    this.state = 'fight';
    this.ui.showFight();
    this.ui.syncLanding();

    this.arena.loadStage(this.stageId);
    if (EDITION === 'enhanced') this.applyEnhancedVisuals();

    for (const f of this.fighters) if (f) this.scene.remove(f.model.group);
    const p1 = new Fighter(this.pickP1, 1, this.scene, this);
    const p2 = new Fighter(this.pickP2, -1, this.scene, this);
    p1.opponent = p2; p2.opponent = p1;
    this.fighters = [p1, p2];
    const sp1 = this.spawnP1 || [-2.6, 0, 0];
    const sp2 = this.spawnAI || [2.6, 0, 0];
    p1.reset(sp1[0]); p2.reset(sp2[0]);

    this.ai = mode === 'cpu' ? new AIController(p2, this.difficulty) : null;
    this.roundsToWin = Math.ceil(((window.GAME_BEST_OF) || 3) / 2);
    this.stats = { hits: [0, 0], dmg: [0, 0] };
    this.round = 1;
    this.roundPhase = 'intro';
    this.phaseT = 0;
    this.camDirector.resumeGame();
    const om = $('orbitMode'); if (om) om.checked = false;

    this.ui.setNames(p1.def.name, p2.def.name);
    const stage = STAGES.find(s => s.id === this.stageId);
    this.ui.setStageTag(stage ? `${stage.name} · ${stage.label}` : '');
    this.ui.setRoundLabel(this.round);
    this.ui.setHealth(1, 100); this.ui.setHealth(2, 100);
    this.ui.setRounds(0, 0);
    audio.startAmbience(stage.ambience || 'crowd');

    // intro
    p1.state = 'intro'; p2.state = 'intro';
    p1.animator.play(p1.charId === 'kaka' ? 'introKaka' : 'introPor');
    p2.animator.play(p2.charId === 'kaka' ? 'introKaka' : 'introPor');
    audio.playClip(p1.charId + '_intro');
    audio.playClip(p2.charId + '_intro');
    this.ui.banner(`${p1.def.name} VS ${p2.def.name}`, true, 2.2); // verified intro banner: `${label} — DI TEKAAAA!` carry-over
  }

  beginRound() {
    const [p1, p2] = this.fighters;
    if (this._preKOParams) { Object.assign(this.fightCam.params, this._preKOParams); this._preKOParams = null; this.ui.syncViewSliders(); }
    const sp1 = this.spawnP1 || [-2.6, 0, 0];
    const sp2 = this.spawnAI || [2.6, 0, 0];
    p1.reset(sp1[0]); p2.reset(sp2[0]);
    p1.health = p1.maxHealth; p2.health = p2.maxHealth;
    if (this.training) { p1.meter = 100; p2.meter = 100; }
    this.timer = ROUND_TIME;
    this.roundPhase = 'banner';
    this.phaseT = 0;
    // verified: FINAL ROUND when round >= 3 or both fighters have one win
    const finalRound = this.round >= 3 || (p1.roundsWon === 1 && p2.roundsWon === 1);
    this.ui.setRoundLabel(finalRound ? 'FINAL ROUND' : this.round);
    this.ui.setHealth(1, 100); this.ui.setHealth(2, 100);
    this.ui.setTimer(this.timer);
    audio.playClip('round' + this.round);
  }

  onKO(loser) {
    if (this.roundPhase !== 'fight') return;
    this.roundPhase = 'ko';
    this.phaseT = 0;
    // verified: KO slow-mo .3× recovering over 1.4 s (2.4 s at match point)
    const matchPoint = loser.roundsWon + 1 >= this.roundsToWin || loser.opponent.roundsWon + 1 >= this.roundsToWin;
    this._koDur = matchPoint ? 2.4 : 1.4;
    this.timeScale = 0.3;
    this.hitStop = 0.12;
    this.ui.banner('K.O.!', true, 2);
    audio.playClip('ko');
    const winner = loser.opponent;
    winner.roundsWon++;
    this.effects.ring(new THREE.Vector3(loser.x, 1, loser.z), 0xff4444);
    if (this.edition === 'enhanced') {
      if (!this._preKOParams) this._preKOParams = { ...this.fightCam.params };
      Object.assign(this.fightCam.params, { height: 1.2, distance: 4.2, lookHeight: 0.9, fov: 34 });
      this.fightCam._pos = null; this.fightCam._look = null;
    }
  }

  timeUp() {
    this.roundPhase = 'ko';
    this.phaseT = 0;
    const [p1, p2] = this.fighters;
    const h1 = p1.health / p1.maxHealth, h2 = p2.health / p2.maxHealth;
    const winner = h1 === h2 ? null : (h1 > h2 ? p1 : p2);   // verified: higher health wins, tie = draw
    if (winner) winner.roundsWon++;
    this._timeDraw = !winner;
    this.ui.banner(winner ? `TIME! ${winner.def.name} TAKES ROUND ${this.round}` : 'TIME UP — DRAW', false, 2);
    audio.playClip('timeup');
  }

  endRound() {
    const [p1, p2] = this.fighters;
    this.ui.setRounds(p1.roundsWon, p2.roundsWon);
    if (this.training) {
      p1.health = p1.maxHealth; p2.health = p2.maxHealth;
      this.roundPhase = 'fight';
      return;
    }
    if (p1.roundsWon >= this.roundsToWin || p2.roundsWon >= this.roundsToWin) {
      this.matchEnd(p1.roundsWon > p2.roundsWon ? p1 : p2);
    } else {
      // verified banner texts: round win / draw, then next round after 3.2 s
      const w = p1.roundsWon > this._prevRounds1 ? p1 : (p2.roundsWon > this._prevRounds2 ? p2 : null);
      this._prevRounds1 = p1.roundsWon; this._prevRounds2 = p2.roundsWon;
      this.ui.banner(this._timeDraw ? 'DRAW — DO IT AGAIN' : `${w.def.name} TAKES ROUND ${this.round}`, false, 2.4);
      this._timeDraw = false;
      this.round++;
      this._nextRoundT = 3.2;
      this.roundPhase = 'matchend';
    }
  }

  matchEnd(winner) {
    this.roundPhase = 'matchend';
    this.phaseT = 0;
    const loser = winner.opponent;
    winner.state = 'win';
    loser.state = 'lose';
    winner.animator.play(winner.charId === 'kaka' ? 'winKaka' : 'winPor');
    winner.shout('win');
    loser.shout('lose');
    audio.playClip('victory');
    this.ui.banner(`${winner.def.name} WINS`, true, 2.6); // verified match banner
    setTimeout(() => {
      if (this.state !== 'fight') return;
      $('replayBtn').textContent = 'Play again'; // verified label
    $('replayBtn').style.display = 'block';
      this.state = 'results';
      const st = this.stats;
      const statsLine = this.edition === 'enhanced' ? ` · hits ${st.hits[0]}–${st.hits[1]} · dmg ${Math.round(st.dmg[0])}–${Math.round(st.dmg[1])}` : '';
      this.ui.toast(winner.def.name + ' WINS! ' + winner.def.tagline + statsLine, 3500);
    }, 2400);
  }

  // ---- training mode ----------------------------------------------------------------
  toggleTraining() {
    if (this.state !== 'fight') return;
    this.training = !this.training;
    document.body.classList.toggle('training', this.training);
    const p2 = this.fighters[1];
    if (p2) p2.dummy = this.training;
    this.ui.banner(this.training ? 'TRAINING MODE' : 'NORMAL MODE', false, 1.4);
    audio.playClip(this.training ? 'trainon' : 'trainoff');
    if (this.training) { this.fighters[0].meter = 100; this.fighters[1].meter = 100; }
  }

  pause() {
    if (this.state !== 'fight') return;
    this.state = 'paused';
    document.body.classList.add('paused');
    audio.menuBack();
  }
  resume() {
    if (this.state === 'paused') {
      this.state = 'fight';
      document.body.classList.remove('paused');
    }
  }
  restartMatch() {
    document.body.classList.remove('paused');
    $('replayBtn').style.display = 'none';
    this.startFight(this.mode);
  }
  quitToSelect() {
    document.body.classList.remove('paused');
    document.body.classList.remove('fighting');
    document.body.classList.remove('training');
    this.training = false;
    $('replayBtn').style.display = 'none';
    audio.stopAmbience();
    this.state = 'select';
    this.ui.showLanding();
    this.ui.syncLanding();
  }

  // ---- input ---------------------------------------------------------------------------
  readInput(map, prev) {
    const inp = { left: false, right: false, up: false, down: false, punchP: false, kickP: false, grabP: false, heavyP: false, specialP: false, tauntP: false };
    const has = (arr) => arr.some(c => this.keys.has(c));
    const T = this.touchInput;
    inp.left = has(map.left) || T.left;
    inp.right = has(map.right) || T.right;
    inp.up = has(map.up) || T.up;
    inp.down = has(map.down) || T.down;
    for (const k of ['punch', 'kick', 'heavy', 'grab', 'special']) {
      const now = has(map[k]) || (T[k + 'P'] === true);
      inp[k + 'P'] = now && !prev[k];
      prev[k] = now;
    }
    inp.tauntP = this._tauntQueued === true;
    this._tauntQueued = false;
    return inp;
  }

  applyEnhancedVisuals() {
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
  }

  // ---- main loop ---------------------------------------------------------------------------
  loop = () => {
    requestAnimationFrame(this.loop);
    const dtReal = Math.min(0.05, this.clock.getDelta());
    const active = this.state === 'fight';
    if (active) {
      if (this.hitStop > 0) { this.hitStop -= dtReal; }
      else {
        const dt = dtReal * this.timeScale;
        // verified: slow-mo recovers to 1× over the KO window (1.4 s / 2.4 s match point)
        if (this.timeScale < 1) this.timeScale = Math.min(1, this.timeScale + dtReal * (this._koDur ? 0.7 / this._koDur : 0.8));

        const [p1, p2] = this.fighters;
        const prev1 = this._prev1 = this._prev1 || {};
        const prev2 = this._prev2 = this._prev2 || {};

        if (this.roundPhase === 'intro') {
          this.phaseT += dt;
          if (this.phaseT > 1.9) this.beginRound();   // verified intro 1.9 s
        } else if (this.roundPhase === 'banner') {
          this.phaseT += dt;
          if (this.phaseT > 0.9 && !this._fightShown) {
            this._fightShown = true;
            this.ui.banner('FIGHT!', true, 0.9);
            audio.playClip('di_teka');
            audio.playClip('fight');
            p1.state = 'idle'; p2.state = 'idle';
          }
          if (this.phaseT > 1.4) { this.roundPhase = 'fight'; this._fightShown = false; }
        } else if (this.roundPhase === 'fight') {
          const in1 = this.readInput(KEYMAP_P1, prev1);
          const in2 = this.mode === '2p' ? this.readInput(KEYMAP_P2, prev2) : this.ai.update(dt, p1, this);
          p1.update(dt, in1, p2);
          p2.update(dt, in2, p1);
          if (this.training) {
            // verified: auto-heal (2 s after damage starts, or instantly below 25); meter stays full
            const hurt = p1.health < 100 || p2.health < 100;
            this._trainT = hurt ? (this._trainT || 0) + dt : 0;
            if (this._trainT > 2 || p1.health < 25 || p2.health < 25) { p1.health = 100; p2.health = 100; this._trainT = 0; }
            p1.meter = 100; p2.meter = 100;
          }
          this.timer -= dt;
          if (this.timer <= 0 && !this.training) this.timeUp();
          else if (this.timer <= 0) this.timer = ROUND_TIME;
          this.ui.setTimer(this.timer);
          this.ui.setHealth(1, (p1.health / p1.maxHealth) * 100);
          this.ui.setHealth(2, (p2.health / p2.maxHealth) * 100);
          this.ui.setMeter(1, p1.meter, p1.meter >= 100);
          this.ui.setMeter(2, p2.meter, p2.meter >= 100);
          this.ui.setRounds(p1.roundsWon, p2.roundsWon);
        } else if (this.roundPhase === 'ko') {
          p1.update(dt, null, p2);
          p2.update(dt, null, p1);
          this.phaseT += dtReal;
          if (this.phaseT > 2.0) { this.timeScale = 1; this.endRound(); }
        } else if (this.roundPhase === 'matchend') {
          p1.update(dt, null, p2);
          p2.update(dt, null, p1);
          if (this._nextRoundT != null) {           // verified: next round after 3.2 s
            this._nextRoundT -= dtReal;
            if (this._nextRoundT <= 0) { this._nextRoundT = null; this.beginRound(); }
          }
        }
        this.effects.update(dt);
        this.arena.update(dt, this.clock.elapsedTime);
      }
      if (this.camDirector.mode === 'game') this.fightCam.update(dtReal, this.fighters[0], this.fighters[1]);
      else this.camDirector.update(dtReal, { center: this.fightersMidpoint() });
      this.ui.syncCamDirector(this.camDirector);
    } else if (this.state === 'loading' || document.body.classList.contains('selecting')) {
      // showcase orbit behind boot/landing
      this.camDirector.orbit.theta += dtReal * 0.1;
      this.camDirector.update(dtReal, { center: new THREE.Vector3(0, 1.6, 0) });
      this.arena.update(dtReal, this.clock.elapsedTime);
    }
    this.renderer.render(this.scene, this.camera);
  };
}

export function boot(canvas) {
  return new Game(canvas);
}
