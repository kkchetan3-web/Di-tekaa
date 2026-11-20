// game.js — Game orchestrator: states, round flow, input, loop

import * as THREE from 'three';
import { audio } from './audio.js';
import { ArenaManager } from './arenas.js';
import { FightCamera, CameraDirector } from './camera.js';
import { Fighter, Effects } from './combat.js';
import { AIController } from './ai.js';
import { ArenaEditor } from './editor.js';
import { UI } from './ui.js';
import { ROSTER, STAGES, ROUND_TIME, ROUNDS_TO_WIN, KEYMAP_P1, KEYMAP_P2, EDITION, VERSION } from './config.js';

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
    this.training = false;
    this.allowTaunts = true;
    this.round = 1;
    this.timer = ROUND_TIME;
    this.roundPhase = 'intro';
    this.phaseT = 0;
    this.hitStop = 0;
    this.timeScale = 1;
    this.backgroundURL = null;

    // input
    this.keys = new Set();
    window.addEventListener('keydown', (e) => { this.keys.add(e.code); if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault(); });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));

    this.clock = new THREE.Clock();
    this.audio = audio;
    this.ui.bindAll();
    this.camDirector.attachDrag(canvas, { get center() { return this.game ? this.game.fightersMidpoint() : null; } });
    this.editor.attachDrag(canvas);

    window.addEventListener('resize', () => this.resize());
    this.resize();
    this.ui.setLoading(0.2, 'loading fighters…');
    this.arena.loadStage('assembly');
    this.camDirector.playOrbit({ center: new THREE.Vector3(0, 1.6, 0) });
    this.buildPortraits().then(() => {
      this.ui.setLoading(1, 'ready');
      this.state = 'title';
      this.ui.show('title');
      $('ver-tag').textContent = VERSION;
    });
    audio.loadManifest();
    this.loop();
  }

  $id = (id) => document.getElementById(id);

  resize() {
    const w = innerWidth, h = innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  // ---- procedural portraits for the select screen ---------------------------
  async buildPortraits() {
    for (const c of this.roster) {
      const s = new THREE.Scene();
      s.background = new THREE.Color(0x1a1418);
      const key = new THREE.DirectionalLight(0xffffff, 2.4); key.position.set(2, 3, 4); s.add(key);
      s.add(new THREE.HemisphereLight(0xffaa88, 0x30242c, 1.2));
      const { FighterModel } = await import('./characters.js');
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
      const url = this.canvas.toDataURL('image/png');
      const img = document.querySelector(`.fcard .fport img[alt="${c.name}"]`);
      if (img) img.src = url;
      this.resize();
    }
  }

  fightersMidpoint() {
    if (!this.fighters[0] || !this.fighters[1]) return new THREE.Vector3(0, 1, 0);
    return new THREE.Vector3((this.fighters[0].x + this.fighters[1].x) / 2, 1, 0);
  }

  // ---- flow ------------------------------------------------------------------
  toSelect() {
    this.state = 'select';
    this.ui.show('select');
    this.ui.markPicks(this.pickP1, this.pickP2, this.mode);
    this.ui.setStageCards(this.stageId);
    this.ui.setDiffCards(this.difficulty);
    $('mode-note').textContent = '1P VS CPU';
  }

  pickFighter(id, el) {
    audio.menuMove();
    if (!this._pickingP2) {
      this.pickP1 = id;
      this._pickingP2 = true;
      $('mode-note').textContent = this.mode === '2p' ? 'PICKING P2' : 'PICKING CPU';
    } else {
      this.pickP2 = id;
      this._pickingP2 = false;
      $('mode-note').textContent = '1P VS CPU';
    }
    this.ui.markPicks(this.pickP1, this.pickP2, this.mode);
  }

  startFight(mode) {
    this.mode = mode;
    this._pickingP2 = false;
    this.state = 'fight';
    this.ui.show('fight');
    $('hud').classList.remove('hidden');

    // stage
    this.arena.loadStage(this.stageId);
    if (EDITION === 'enhanced') this.applyEnhancedVisuals();

    // fighters (rebuild fresh each match)
    for (const f of this.fighters) if (f) this.scene.remove(f.model.group);
    const p1 = new Fighter(this.pickP1, 1, this.scene, this);
    const p2 = new Fighter(this.pickP2, -1, this.scene, this);
    p1.opponent = p2; p2.opponent = p1;
    this.fighters = [p1, p2];
    const sp1 = this.spawnP1 || [-2.6, 0, 0];
    const sp2 = this.spawnAI || [2.6, 0, 0];
    p1.reset(sp1[0]); p2.reset(sp2[0]);

    this.ai = mode === 'cpu' ? new AIController(p2, this.difficulty) : null;
    this.roundsToWin = Math.ceil(((typeof window !== 'undefined' && window.GAME_BEST_OF) || 3) / 2);
    this.stats = { hits: [0, 0], dmg: [0, 0] };
    this.round = 1;
    this.roundPhase = 'intro';
    this.phaseT = 0;
    this.camDirector.resumeGame();
    $('edOrbit').classList.remove('on');

    this.ui.setNames(p1.def.name, p2.def.name);
    this.ui.setRoundLabel(this.round);
    $('hud-tl').textContent = (STAGES.find(s => s.id === this.stageId) || {}).name || '';
    audio.startAmbience((STAGES.find(s => s.id === this.stageId) || {}).ambience || 'crowd');

    // intro
    p1.state = 'intro'; p2.state = 'intro';
    p1.animator.play(p1.charId === 'kaka' ? 'introKaka' : 'introPor');
    p2.animator.play(p2.charId === 'kaka' ? 'introKaka' : 'introPor');
    audio.playClip(p1.charId + '_intro');
    audio.playClip(p2.charId + '_intro');
    this.ui.banner(this.mode === '2p' ? 'P1 VS P2' : `${p1.def.name} VS ${p2.def.name}`, STAGES.find(s => s.id === this.stageId)?.label || '', 2.2);
  }

  beginRound() {
    const [p1, p2] = this.fighters;
    // restore any finisher-cam override
    if (this._preKOParams) { Object.assign(this.fightCam.params, this._preKOParams); this._preKOParams = null; this.ui.syncViewSliders(); }
    const sp1 = this.spawnP1 || [-2.6, 0, 0];
    const sp2 = this.spawnAI || [2.6, 0, 0];
    p1.reset(sp1[0]); p2.reset(sp2[0]);
    p1.health = p1.maxHealth; p2.health = p2.maxHealth;
    if (this.training) { p1.meter = 100; p2.meter = 100; }
    this.timer = ROUND_TIME;
    this.roundPhase = 'banner';
    this.phaseT = 0;
    this.ui.setRoundLabel(this.round);
    this.ui.setHealth(1, 100); this.ui.setHealth(2, 100);
    audio.playClip('round' + this.round).then(ok => { if (!ok) {} });
  }

  onKO(loser) {
    if (this.roundPhase !== 'fight') return;
    this.roundPhase = 'ko';
    this.phaseT = 0;
    this.timeScale = 0.35;
    this.hitStop = 0.12;
    this.ui.banner('K.O.!', '', 2);
    audio.playClip('ko');
    const winner = loser.opponent;
    winner.roundsWon++;
    this.effects.ring(new THREE.Vector3(loser.x, 1, loser.z), 0xff4444);
    if (this.edition === 'enhanced') {
      // finisher camera: dramatic zoom on the loser
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
    const winner = h1 === h2 ? null : (h1 > h2 ? p1 : p2);
    if (winner) winner.roundsWon++;
    this.ui.banner('TIME UP', winner ? winner.def.name + ' leads' : 'DRAW', 2);
    audio.playClip('timeup');
  }

  endRound() {
    const [p1, p2] = this.fighters;
    this.ui.setRounds(p1.roundsWon, p2.roundsWon);
    if (this.training) {
      // no KO conditions in training — refill and continue
      p1.health = p1.maxHealth; p2.health = p2.maxHealth;
      this.roundPhase = 'fight';
      return;
    }
    if (p1.roundsWon >= this.roundsToWin || p2.roundsWon >= this.roundsToWin) {
      this.matchEnd(p1.roundsWon > p2.roundsWon ? p1 : p2);
    } else {
      this.round++;
      this.beginRound();
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
    this.ui.banner(winner.def.name + ' WINS!', winner.charId === winner.charId ? winner.def.tagline : '', 2.6);
    setTimeout(() => {
      if (this.state !== 'fight') return;
      this.state = 'results';
      this.ui.show('results');
      $('results-title').textContent = winner.def.name + ' WINS!';
      const st = this.stats;
      const statsLine = this.edition === 'enhanced' ? ` · hits ${st.hits[0]}–${st.hits[1]} · dmg ${Math.round(st.dmg[0])}–${Math.round(st.dmg[1])}` : '';
      $('results-sub').textContent = (this.mode === 'cpu' && winner.side === -1 ? 'CPU WINS — ' : '') + winner.def.tagline + (this.training ? ' · training mode' : '') + statsLine;
      $('hud').classList.add('hidden');
    }, 2200);
  }

  // ---- training mode ---------------------------------------------------------
  toggleTraining() {
    if (this.state !== 'fight') return;
    this.training = !this.training;
    const p2 = this.fighters[1];
    if (p2) p2.dummy = this.training;
    this.ui.banner(this.training ? 'TRAINING MODE' : 'NORMAL MODE', this.training ? 'opponent stands still · no KO · meters full' : 'back to the fight', 1.6);
    audio.playClip(this.training ? 'trainon' : 'trainoff');
    if (this.training) { this.fighters[0].meter = 100; this.fighters[1].meter = 100; }
  }

  pause() {
    if (this.state !== 'fight') return;
    this.state = 'paused';
    this.ui.show('pause');
    audio.menuBack();
  }
  resume() { if (this.state === 'paused') { this.state = 'fight'; this.ui.show('fight'); } }
  restartMatch() { this.state = 'fight'; this.ui.show('fight'); this.startFight(this.mode); }
  quitToSelect() {
    this.state = 'select';
    this.ui.show('select');
    audio.stopAmbience();
    $('hud').classList.add('hidden');
    this.training = false;
    this.toSelect();
  }

  // ---- input ------------------------------------------------------------------
  readInput(map, prev) {
    const inp = { left: false, right: false, up: false, down: false, punchP: false, kickP: false, heavyP: false, specialP: false, tauntP: false };
    const has = (arr) => arr.some(c => this.keys.has(c));
    inp.left = has(map.left); inp.right = has(map.right);
    inp.up = has(map.up); inp.down = has(map.down);
    for (const k of ['punch', 'kick', 'heavy', 'special']) {
      const now = has(map[k]);
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

  // ---- main loop ----------------------------------------------------------------
  loop = () => {
    requestAnimationFrame(this.loop);
    const dtReal = Math.min(0.05, this.clock.getDelta());
    const active = this.state === 'fight';
    if (active) {
      if (this.hitStop > 0) { this.hitStop -= dtReal; }
      else {
        const dt = dtReal * this.timeScale;
        // slow-mo recovery
        if (this.timeScale < 1) this.timeScale = Math.min(1, this.timeScale + dtReal * 0.8);

        const [p1, p2] = this.fighters;
        const prev1 = this._prev1 = this._prev1 || {};
        const prev2 = this._prev2 = this._prev2 || {};

        if (this.roundPhase === 'intro') {
          this.phaseT += dt;
          if (this.phaseT > 2.0) { this.beginRound(); }
        } else if (this.roundPhase === 'banner') {
          this.phaseT += dt;
          if (this.phaseT > 0.9 && !this._fightShown) {
            this._fightShown = true;
            this.ui.banner('FIGHT!', 'DI TEKAAAA!', 0.9);
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
          if (this.training) { p1.meter = 100; p2.meter = 100; p1.health = Math.max(p1.health, 1); p2.health = Math.max(p2.health, 1); }
          // timer
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
          const dt2 = dt;
          p1.update(dt2, null, p2);
          p2.update(dt2, null, p1);
          this.phaseT += dtReal;
          if (this.phaseT > 2.0) { this.timeScale = 1; this.endRound(); }
        } else if (this.roundPhase === 'matchend') {
          p1.update(dt, null, p2);
          p2.update(dt, null, p1);
        }
        this.effects.update(dt);
        this.arena.update(dt, this.clock.elapsedTime);
      }
      // camera
      if (this.camDirector.mode === 'game') this.fightCam.update(dtReal, this.fighters[0], this.fighters[1]);
      else this.camDirector.update(dtReal, { center: this.fightersMidpoint() });
      this.ui.syncCamDirector(this.camDirector);
    } else if (this.state === 'title' || this.state === 'select') {
      // slow showcase orbit behind menus
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
