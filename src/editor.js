// editor.js — Arena GLB Transform panel + Export/Import configuration

import { SPAWN_DEFAULTS, VIEW_DEFAULTS } from './config.js';

const $ = (id) => document.getElementById(id);

export class ArenaEditor {
  constructor(arenaMgr, game) {
    this.am = arenaMgr;
    this.game = game;
    this.mode = 'move';
    this.selected = -1;
    this.visible = false;
    this.drag = null;
    this.bindUI();
  }

  bindUI() {
    const on = (id, ev, fn) => { const el = $(id); if (el) el.addEventListener(ev, fn); };
    on('edUpload', 'change', (e) => {
      const f = e.target.files[0];
      if (!f) return;
      const url = URL.createObjectURL(f);
      this.am.addGLB(f.name, url).then((entry) => {
        this.selected = this.am.glbEntries.length - 1;
        this.syncFields();
      }).catch(err => alert('GLB load failed: ' + err));
      e.target.value = '';
    });
    for (const m of ['move', 'rotate', 'scale']) on('edMode' + m, 'click', () => this.setMode(m));
    on('edOrbit', 'click', () => {
      const cd = this.game.camDirector;
      if (cd.mode === 'orbit') cd.resumeGame(); else cd.playOrbit({ center: new (this.game.THREE.Vector3)(0, 1, 0) });
      $('edOrbit').classList.toggle('on', cd.mode === 'orbit');
    });
    on('edResetCam', 'click', () => { this.game.camDirector.resumeGame(); $('edOrbit').classList.remove('on'); });
    for (const k of ['Scale', 'PosX', 'PosY', 'PosZ', 'RotX', 'RotY', 'RotZ'])
      on('ed' + k, 'input', () => this.applyFields());
    // spawn fields
    for (const k of ['P1X', 'P1Y', 'P1Z', 'AIX', 'AIY', 'AIZ']) on('ed' + k, 'input', () => this.applySpawns());
    // export cluster (bound to both the arena panel and the quick export panel)
    const cfgUI = (suffix) => ({
      out: $('edConfigOut' + suffix), inn: $('edConfigIn' + suffix),
    });
    const showCfg = (suffix) => { const { out } = cfgUI(suffix); if (out) out.textContent = this.configJSON(); };
    const copyCfg = async (suffix) => {
      const { out } = cfgUI(suffix);
      const txt = this.configJSON();
      if (out) out.textContent = txt;
      try { await navigator.clipboard.writeText(txt); if (out) out.textContent = txt + '\n— copied to clipboard —'; } catch (e) {}
    };
    const saveCfg = (suffix) => {
      const { out } = cfgUI(suffix);
      try { localStorage.setItem('diteka-arena-config', this.configJSON()); if (out) out.textContent = 'saved to localStorage ✔'; } catch (e) { if (out) out.textContent = 'save failed'; }
    };
    const loadCfg = (suffix) => {
      const { out } = cfgUI(suffix);
      const txt = localStorage.getItem('diteka-arena-config');
      if (!txt) { if (out) out.textContent = 'nothing saved yet'; return; }
      this.applyConfigText(txt, out);
    };
    const applyCfg = (suffix) => {
      const { inn, out } = cfgUI(suffix);
      this.applyConfigText(inn ? inn.value : '', out);
    };
    for (const s of ['', '2']) {
      on('edShow' + s, 'click', () => showCfg(s));
      on('edCopy' + s, 'click', () => copyCfg(s));
      on('edSave' + s, 'click', () => saveCfg(s));
      on('edLoad' + s, 'click', () => loadCfg(s));
      on('edApplyText' + s, 'click', () => applyCfg(s));
    }
    on('edBgLoad', 'click', () => {
      const path = $('edBgPath').value.trim();
      this.game.backgroundURL = path || null;
      this.game.arena.setBackground(path || null);
    });
  }

  setMode(m) {
    this.mode = m;
    for (const k of ['move', 'rotate', 'scale']) { const b = $('edMode' + k); if (b) b.classList.toggle('on', k === m); }
  }

  selectedEntry() { return this.am.glbEntries[this.selected] || null; }

  applyFields() {
    const e = this.selectedEntry();
    if (!e) return;
    const v = (id, d) => { const el = $(id); return el && el.value !== '' ? parseFloat(el.value) : d; };
    e.scale = v('edScale', e.scale);
    e.pos = [v('edPosX', e.pos[0]), v('edPosY', e.pos[1]), v('edPosZ', e.pos[2])];
    e.rot = [v('edRotX', e.rot[0]), v('edRotY', e.rot[1]), v('edRotZ', e.rot[2])];
    this.am.applyEntryTransform(e);
  }

  syncFields() {
    const e = this.selectedEntry();
    const set = (id, val) => { const el = $(id); if (el) el.value = val; };
    if (!e) {
      for (const id of ['edScale', 'edPosX', 'edPosY', 'edPosZ', 'edRotX', 'edRotY', 'edRotZ']) set(id, '');
      return;
    }
    set('edScale', e.scale.toFixed(3));
    set('edPosX', e.pos[0].toFixed(2)); set('edPosY', e.pos[1].toFixed(2)); set('edPosZ', e.pos[2].toFixed(2));
    set('edRotX', e.rot[0].toFixed(1)); set('edRotY', e.rot[1].toFixed(1)); set('edRotZ', e.rot[2].toFixed(1));
  }

  applySpawns() {
    const v = (id, d) => { const el = $(id); const n = el ? parseFloat(el.value) : NaN; return isNaN(n) ? d : n; };
    this.game.spawnP1 = [v('edP1X', SPAWN_DEFAULTS.p1[0]), v('edP1Y', SPAWN_DEFAULTS.p1[1]), v('edP1Z', SPAWN_DEFAULTS.p1[2])];
    this.game.spawnAI = [v('edAIX', SPAWN_DEFAULTS.ai[0]), v('edAIY', SPAWN_DEFAULTS.ai[1]), v('edAIZ', SPAWN_DEFAULTS.ai[2])];
  }

  syncSpawns() {
    const set = (id, val) => { const el = $(id); if (el) el.value = (+val).toFixed(2); };
    const p1 = this.game.spawnP1 || SPAWN_DEFAULTS.p1, ai = this.game.spawnAI || SPAWN_DEFAULTS.ai;
    set('edP1X', p1[0]); set('edP1Y', p1[1]); set('edP1Z', p1[2]);
    set('edAIX', ai[0]); set('edAIY', ai[1]); set('edAIZ', ai[2]);
  }

  // drag on canvas moves/rotates/scales selected GLB
  attachDrag(canvas) {
    let down = false, lx = 0, ly = 0;
    canvas.addEventListener('pointerdown', (e) => {
      if (!this.visible || this.mode === 'none') return;
      if (!this.selectedEntry()) return;
      down = true; lx = e.clientX; ly = e.clientY;
    });
    window.addEventListener('pointermove', (e) => {
      if (!down) return;
      const dx = (e.clientX - lx) * 0.01, dy = (e.clientY - ly) * 0.01;
      lx = e.clientX; ly = e.clientY;
      const e2 = this.selectedEntry();
      if (!e2) return;
      if (this.mode === 'move') { e2.pos[0] += dx * 2; e2.pos[1] = Math.max(0, e2.pos[1] - dy * 2); }
      else if (this.mode === 'rotate') { e2.rot[1] += dx * 30; e2.rot[0] -= dy * 30; }
      else { e2.scale = Math.max(0.05, e2.scale + dx); }
      this.am.applyEntryTransform(e2);
      this.syncFields();
    });
    window.addEventListener('pointerup', () => { down = false; });
  }

  configJSON() {
    const g = this.game;
    return JSON.stringify({
      version: 1,
      edition: g.edition,
      stage: g.stageId,
      glbEntries: this.am.glbEntries.map(e => ({ name: e.name, pos: e.pos, rot: e.rot, scale: e.scale })),
      p1Spawn: g.spawnP1 || SPAWN_DEFAULTS.p1,
      aiSpawn: g.spawnAI || SPAWN_DEFAULTS.ai,
      view: g.fightCam.params,
      camKeys: g.camDirector.keys,
      background: g.backgroundURL || null,
    }, null, 2);
  }

  applyConfigText(txt, outEl) {
    const out = outEl || $('edConfigOut');
    try {
      const o = JSON.parse(txt);
      if (o.version !== 1) throw new Error('unsupported version');
      if (o.stage && ['assembly', 'path', 'miramar'].includes(o.stage)) {
        this.game.stageId = o.stage;
        this.am.loadStage(o.stage);
        this.game.ui.setStageCards(o.stage);
      }
      for (const ge of o.glbEntries || []) {
        // entries without a live file can't be re-fetched; apply to matching already-uploaded names first
        const match = this.am.glbEntries.find(e => e.name === ge.name);
        if (match) { Object.assign(match, { pos: ge.pos, rot: ge.rot, scale: ge.scale }); this.am.applyEntryTransform(match); }
      }
      if (o.p1Spawn) this.game.spawnP1 = o.p1Spawn.map(Number);
      if (o.aiSpawn) this.game.spawnAI = o.aiSpawn.map(Number);
      if (o.view) Object.assign(this.game.fightCam.params, o.view);
      this.game.ui.syncViewSliders();
      if (o.camKeys) { this.game.camDirector.keys = o.camKeys; }
      if (o.background) { this.game.backgroundURL = o.background; this.am.setBackground(o.background); $('edBgPath').value = o.background; }
      this.syncFields(); this.syncSpawns();
      out.textContent = 'config applied ✔' + ((o.glbEntries || []).length ? ' (GLB files must be re-uploaded manually)' : '');
      return true;
    } catch (e) {
      out.textContent = 'invalid config: ' + e.message;
      return false;
    }
  }

  toggleVisible() {
    this.visible = !this.visible;
    const el = $('panel-arena');
    if (el) el.classList.toggle('hidden', !this.visible);
    if (this.visible) { this.syncFields(); this.syncSpawns(); }
  }
}
