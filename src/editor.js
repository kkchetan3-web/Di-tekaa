// editor.js — Arena GLB Transform + Export Arena Config (rebuilt to verified original ids)

import { SPAWN_DEFAULTS } from './config.js';

const $ = (id) => document.getElementById(id);

export class ArenaEditor {
  constructor(arenaMgr, game) {
    this.am = arenaMgr;
    this.game = game;
    this.mode = 'translate';
    this.selected = -1;
    this.visible = false;
    this.drag = null;
    this.bindUI();
  }

  bindUI() {
    const on = (id, ev, fn) => { const el = $(id); if (el) el.addEventListener(ev, fn); };
    on('arenaUpload', 'change', (e) => {
      const f = e.target.files[0];
      if (!f) return;
      const url = URL.createObjectURL(f);
      this.am.addGLB(f.name, url).then(() => {
        this.selected = this.am.glbEntries.length - 1;
        this.syncFields();
        this.game.ui.toast('GLB loaded — place it with Move/Rotate/Scale');
      }).catch(err => this.game.ui.toast('GLB load failed: ' + err));
      e.target.value = '';
    });
    for (const [btn, m] of [['gizmoTranslate', 'translate'], ['gizmoRotate', 'rotate'], ['gizmoScale', 'scale']]) {
      on(btn, 'click', () => this.setMode(m));
    }
    on('orbitMode', 'change', () => {
      const cd = this.game.camDirector;
      if ($('orbitMode').checked) cd.playOrbit({ center: this.game.fightersMidpoint() });
      else cd.resumeGame();
    });
    on('resetCamera', 'click', () => { cdResume(this.game); $('orbitMode').checked = false; });
    for (const k of ['Scale', 'X', 'Y', 'Z', 'RotX', 'RotY', 'RotZ'])
      on('arena' + k, 'input', () => this.applyFields());
    for (const k of ['p1StartX', 'p1StartY', 'p1StartZ', 'p2StartX', 'p2StartY', 'p2StartZ'])
      on(k, 'input', () => this.applySpawns());
    // export cluster (verified ids)
    on('exportArenaConfig', 'click', () => { $('arenaConfigOutput').textContent = this.configJSON(); });
    on('copyArenaConfig', 'click', async () => {
      const txt = this.configJSON();
      $('arenaConfigOutput').textContent = txt;
      try { await navigator.clipboard.writeText(txt); this.game.ui.toast('config copied'); } catch (e) {}
    });
    on('saveArenaConfig', 'click', () => {
      try { localStorage.setItem('diteka-arena-config', this.configJSON()); this.game.ui.toast('saved to localStorage'); } catch (e) { this.game.ui.toast('save failed'); }
    });
    on('loadArenaConfig', 'click', () => {
      const txt = localStorage.getItem('diteka-arena-config');
      if (!txt) { $('arenaConfigOutput').textContent = 'nothing saved yet'; return; }
      this.applyConfigText(txt);
    });
    on('applyArenaConfig', 'click', () => this.applyConfigText($('arenaConfigInput').value));
    // background image: file input (verified) + path field (verified)
    on('backgroundImage', 'change', (e) => {
      const f = e.target.files[0];
      if (!f) return;
      const url = URL.createObjectURL(f);
      this.game.backgroundURL = url;
      this.am.setBackground(url);
      this.game.ui.toast('background loaded');
    });
    on('loadBackgroundPath', 'click', () => {
      const path = $('backgroundPath').value.trim();
      if (!path) { this.am.setBackground(null); return; }
      // relative paths resolve against the running origin (original default: /assets/arena/background.jpg)
      const url = path.startsWith('/') ? new URL(path, location.href).href : path;
      this.game.backgroundURL = url;
      this.am.setBackground(url);
    });
  }

  setMode(m) {
    this.mode = m;
    for (const [btn, mm] of [['gizmoTranslate', 'translate'], ['gizmoRotate', 'rotate'], ['gizmoScale', 'scale']]) {
      const b = $(btn);
      if (b) b.classList.toggle('on', mm === m);
    }
  }

  selectedEntry() { return this.am.glbEntries[this.selected] || null; }

  applyFields() {
    const e = this.selectedEntry();
    const num = (id, d) => { const el = $(id); const v = el ? parseFloat(el.value) : NaN; return isNaN(v) ? d : v; };
    // spawn fields never have a selected entry
    if (e) {
      e.scale = num('arenaScale', e.scale);
      e.pos = [num('arenaX', e.pos[0]), num('arenaY', e.pos[1]), num('arenaZ', e.pos[2])];
      e.rot = [num('arenaRotX', e.rot[0]), num('arenaRotY', e.rot[1]), num('arenaRotZ', e.rot[2])];
      this.am.applyEntryTransform(e);
    }
  }

  syncFields() {
    const e = this.selectedEntry();
    const set = (id, val) => { const el = $(id); if (el) el.value = val; };
    if (e) {
      set('arenaScale', e.scale.toFixed(3));
      set('arenaX', e.pos[0].toFixed(2)); set('arenaY', e.pos[1].toFixed(2)); set('arenaZ', e.pos[2].toFixed(2));
      set('arenaRotX', e.rot[0].toFixed(1)); set('arenaRotY', e.rot[1].toFixed(1)); set('arenaRotZ', e.rot[2].toFixed(1));
    }
  }

  applySpawns() {
    const num = (id, d) => { const el = $(id); const v = el ? parseFloat(el.value) : NaN; return isNaN(v) ? d : v; };
    this.game.spawnP1 = [num('p1StartX', SPAWN_DEFAULTS.p1[0]), num('p1StartY', SPAWN_DEFAULTS.p1[1]), num('p1StartZ', SPAWN_DEFAULTS.p1[2])];
    this.game.spawnAI = [num('p2StartX', SPAWN_DEFAULTS.ai[0]), num('p2StartY', SPAWN_DEFAULTS.ai[1]), num('p2StartZ', SPAWN_DEFAULTS.ai[2])];
    const sv = (id, val) => { const el = $(id); if (el) el.textContent = (+val).toFixed(2); };
    sv('p1StartXValue', this.game.spawnP1[0]); sv('p1StartYValue', this.game.spawnP1[1]); sv('p1StartZValue', this.game.spawnP1[2]);
    sv('p2StartXValue', this.game.spawnAI[0]); sv('p2StartYValue', this.game.spawnAI[1]); sv('p2StartZValue', this.game.spawnAI[2]);
  }

  syncSpawns() {
    const set = (id, val) => { const el = $(id); if (el) el.value = (+val).toFixed(2); };
    const p1 = this.game.spawnP1 || SPAWN_DEFAULTS.p1, ai = this.game.spawnAI || SPAWN_DEFAULTS.ai;
    set('p1StartX', p1[0]); set('p1StartY', p1[1]); set('p1StartZ', p1[2]);
    set('p2StartX', ai[0]); set('p2StartY', ai[1]); set('p2StartZ', ai[2]);
    this.applySpawns();
  }

  // drag on canvas moves/rotates/scales the selected GLB
  attachDrag(canvas) {
    let down = false, lx = 0, ly = 0;
    canvas.addEventListener('pointerdown', (e) => {
      if (!this.visible || !this.selectedEntry()) return;
      if ($('orbitMode') && $('orbitMode').checked) return;
      down = true; lx = e.clientX; ly = e.clientY;
    });
    window.addEventListener('pointermove', (e) => {
      if (!down) return;
      const dx = (e.clientX - lx) * 0.01, dy = (e.clientY - ly) * 0.01;
      lx = e.clientX; ly = e.clientY;
      const e2 = this.selectedEntry();
      if (!e2) return;
      if (this.mode === 'translate') { e2.pos[0] += dx * 2; e2.pos[1] = Math.max(-50, e2.pos[1] - dy * 2); }
      else if (this.mode === 'rotate') { e2.rot[1] += dx * 30; e2.rot[0] -= dy * 30; }
      else { e2.scale = Math.max(0.05, e2.scale + dx); }
      this.am.applyEntryTransform(e2);
      this.syncFields();
    });
    window.addEventListener('pointerup', () => { down = false; });
  }

  setVisible(v) {
    this.visible = v;
    document.body.classList.toggle('arena-open', v);
    if (v) { this.syncFields(); this.syncSpawns(); }
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
      background: (g.backgroundURL && g.backgroundURL.startsWith('http')) ? g.backgroundURL : null,
    }, null, 2);
  }

  applyConfigText(txt) {
    try {
      const o = JSON.parse(txt);
      if (o.version !== 1) throw new Error('unsupported version');
      if (o.stage && ['assembly', 'path', 'miramar'].includes(o.stage)) {
        this.game.stageId = o.stage;
        this.am.loadStage(o.stage);
        this.game.ui.setBootArena(o.stage);
        this.game.ui.syncLanding();
      }
      for (const ge of o.glbEntries || []) {
        const match = this.am.glbEntries.find(e => e.name === ge.name);
        if (match) { Object.assign(match, { pos: ge.pos, rot: ge.rot, scale: ge.scale }); this.am.applyEntryTransform(match); }
      }
      if (o.p1Spawn) this.game.spawnP1 = o.p1Spawn.map(Number);
      if (o.aiSpawn) this.game.spawnAI = o.aiSpawn.map(Number);
      if (o.view) Object.assign(this.game.fightCam.params, o.view);
      this.game.ui.syncViewSliders();
      if (o.camKeys) this.game.camDirector.keys = o.camKeys;
      if (o.background) { this.game.backgroundURL = o.background; this.am.setBackground(o.background); $('backgroundPath').value = o.background; }
      this.syncFields(); this.syncSpawns();
      $('arenaConfigOutput').textContent = 'config applied ✔' + ((o.glbEntries || []).length ? ' (GLB files must be re-uploaded manually)' : '');
      return true;
    } catch (e) {
      $('arenaConfigOutput').textContent = 'invalid config: ' + e.message;
      return false;
    }
  }
}

function cdResume(game) {
  game.camDirector.resumeGame();
  const om = $('orbitMode');
  if (om) om.checked = false;
}
