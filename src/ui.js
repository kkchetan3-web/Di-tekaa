// ui.js — screens, HUD, panels (DOM layer)

const $ = (id) => document.getElementById(id);
const on = (id, ev, fn) => { const el = $(id); if (el) el.addEventListener(ev, fn); };

export class UI {
  constructor(game) {
    this.game = game;
    this.bannerT = 0;
  }

  show(id) {
    for (const s of ['loading', 'title', 'select', 'fight', 'pause', 'results']) {
      const el = $('screen-' + s);
      if (el) el.classList.toggle('hidden', s !== id);
    }
    if (id === 'fight') { $('screen-fight').classList.remove('hidden'); }
  }

  setLoading(pct, label) {
    $('load-bar').style.width = (pct * 100).toFixed(0) + '%';
    if (label) $('load-label').textContent = label;
  }

  // ---- select screen ------------------------------------------------------
  buildSelectCards(roster, callbacks) {
    const grid = $('fighter-grid');
    grid.innerHTML = '';
    for (const c of roster) {
      const el = document.createElement('div');
      el.className = 'fcard';
      el.style.setProperty('--accent', c.color);
      el.innerHTML = `<div class="fport"><img alt="${c.name}"/></div><div class="fname">${c.name}</div><div class="ftag">${c.tagline}</div><div class="frole"></div>`;
      el.addEventListener('click', () => callbacks.pick(c.id, el));
      grid.appendChild(el);
    }
    for (let i = 0; i < 2; i++) {
      const el = document.createElement('div');
      el.className = 'fcard locked';
      el.innerHTML = `<div class="fport">🔒</div><div class="fname">SOON</div><div class="ftag">locked</div>`;
      grid.appendChild(el);
    }
    const el = document.createElement('div');
    el.className = 'fcard random';
    el.innerHTML = `<div class="fport">?</div><div class="fname">RANDOM</div><div class="ftag">surprise me</div>`;
    el.addEventListener('click', () => callbacks.pickRandom(el));
    grid.appendChild(el);
  }

  markPicks(p1id, p2id, mode) {
    const cards = [...$('fighter-grid').children];
    const roster = this.game.roster;
    cards.forEach((c, i) => {
      const role = c.querySelector('.frole');
      c.classList.remove('picked-p1', 'picked-p2');
      if (role) role.textContent = '';
      const id = roster[i] && roster[i].id;
      if (id && id === p1id) { c.classList.add('picked-p1'); if (role) role.textContent = mode === '2p' ? 'P1' : '1P · YOU'; }
      if (id && id === p2id) { c.classList.add('picked-p2'); if (role) role.textContent = mode === '2p' ? 'P2' : 'CPU'; }
    });
    $('plate-p1-name').textContent = (roster.find(r => r.id === p1id) || {}).name || '—';
    $('plate-p2-name').textContent = (roster.find(r => r.id === p2id) || {}).name || '—';
    $('plate-p1-role').textContent = mode === '2p' ? 'P1' : '1P · YOU';
    $('plate-p2-role').textContent = mode === '2p' ? 'P2' : 'CPU';
  }

  setStageCards(active) {
    document.querySelectorAll('.scard').forEach(c => c.classList.toggle('picked', c.dataset.stage === active));
  }

  setDiffCards(active) {
    document.querySelectorAll('.dcard').forEach(c => c.classList.toggle('picked', c.dataset.diff === active));
  }

  // ---- fight HUD -----------------------------------------------------------
  setNames(n1, n2) { $('hud-n1').textContent = n1; $('hud-n2').textContent = n2; }
  setHealth(side, pct) { $(side === 1 ? 'hp1' : 'hp2').style.width = Math.max(0, pct) + '%'; }
  setMeter(side, val, full) {
    const el = $(side === 1 ? 'mt1' : 'mt2');
    el.style.width = val + '%';
    el.classList.toggle('full', !!full);
  }
  setRounds(w1, w2) {
    const need = this.game.roundsToWin || 2;
    $('pips1').textContent = '●'.repeat(w1) + '○'.repeat(Math.max(0, need - w1));
    $('pips2').textContent = '●'.repeat(w2) + '○'.repeat(Math.max(0, need - w2));
  }
  setTimer(t) { $('hud-timer').textContent = String(Math.max(0, Math.ceil(t))).padStart(2, '0'); }
  setRoundLabel(r) { $('hud-round').textContent = 'ROUND ' + r; }

  banner(text, sub = '', dur = 1.6) {
    const b = $('banner');
    $('banner-main').textContent = text;
    $('banner-sub').textContent = sub;
    b.classList.remove('hidden');
    b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
    clearTimeout(this._bt);
    this._bt = setTimeout(() => b.classList.add('hidden'), dur * 1000);
  }

  comboPop(fighter) {
    if (fighter.side !== 1) return;
    const el = $('combo');
    el.textContent = 'HIT!';
    el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
    clearTimeout(this._ct);
    this._ct = setTimeout(() => el.classList.add('hidden'), 700);
    el.classList.remove('hidden');
  }

  flashBlock(side) {
    const el = $(side === 1 ? 'hp1-wrap' : 'hp2-wrap');
    el.classList.remove('blocked'); void el.offsetWidth; el.classList.add('blocked');
  }

  announce(text) { $('announcer').textContent = text; }

  // ---- panels ---------------------------------------------------------------
  syncCamDirector(cd) {
    $('cd-status').textContent = `${cd.mode.toUpperCase()} · ${cd.keys.length} keys` + (cd.keys.length && cd.selected >= 0 ? ` · key ${cd.selected + 1}` : '');
    $('cd-preview-seg').textContent = cd.mode === 'preview' || cd.mode === 'applied' ? `shot ${cd.previewSegment + 1}/${cd.keys.length}` : '';
  }

  syncViewSliders() {
    const p = this.game.fightCam.params;
    for (const k of ['height', 'distance', 'widthMargin', 'lookHeight', 'sideFollow', 'fov']) {
      const el = $('vd-' + k);
      if (el) el.value = p[k];
      const lab = $('vd-' + k + '-v');
      if (lab) lab.textContent = (+p[k]).toFixed(2);
    }
  }

  bindAll() {
    const g = this.game;
    // title
    on('btn-start', 'click', () => { g.audio.menuSelect(); g.toSelect(); });
    // select
    this.buildSelectCards(g.roster, {
      pick: (id, el) => g.pickFighter(id, el),
      pickRandom: (el) => g.pickFighter(g.roster[Math.floor(Math.random() * g.roster.length)].id, el),
    });
    document.querySelectorAll('.scard').forEach(c => c.addEventListener('click', () => { g.audio.menuMove(); g.stageId = c.dataset.stage; this.setStageCards(c.dataset.stage); }));
    document.querySelectorAll('.dcard').forEach(c => c.addEventListener('click', () => { g.audio.menuMove(); g.difficulty = c.dataset.diff; this.setDiffCards(c.dataset.diff); }));
    on('btn-fight', 'click', () => { g.audio.menuSelect(); g.startFight('cpu'); });
    on('btn-2p', 'click', () => { g.audio.menuSelect(); g.startFight('2p'); });
    // hud buttons
    on('btn-pause', 'click', () => g.pause());
    on('btn-sound', 'click', () => {
      g.audio.setMuted(!g.audio.muted);
      $('btn-sound').textContent = g.audio.muted ? '🔇' : '🔊';
    });
    on('btn-full', 'click', () => {
      if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen();
    });
    // pause
    on('btn-resume', 'click', () => g.resume());
    on('btn-restart', 'click', () => g.restartMatch());
    on('btn-quit', 'click', () => g.quitToSelect());
    // results
    on('btn-replay', 'click', () => { g.audio.menuSelect(); g.restartMatch(); });
    on('btn-change', 'click', () => g.quitToSelect());
    // camera director
    on('cd-play', 'click', () => { g.camDirector.playOrbit({ center: g.fightersMidpoint() }); });
    on('cd-preview', 'click', () => g.camDirector.preview());
    on('cd-freeze', 'click', () => g.camDirector.freeze());
    on('cd-add', 'click', () => { g.camDirector.addKey({ center: g.fightersMidpoint() }); this.syncCamDirector(g.camDirector); });
    on('cd-step', 'click', () => {
      const s = g.camDirector.step(1);
      if (s >= 0 && g.camDirector.keys[s]) {
        const k = g.camDirector.keys[s];
        g.camera.position.set(...k.pos);
        g.camDirector._lastLookVec = new g.THREE.Vector3(...k.look);
        g.camera.lookAt(...k.look);
      }
      this.syncCamDirector(g.camDirector);
    });
    on('cd-undo', 'click', () => { g.camDirector.undo(); this.syncCamDirector(g.camDirector); });
    on('cd-clear', 'click', () => { g.camDirector.clear(); this.syncCamDirector(g.camDirector); });
    on('cd-copy', 'click', async () => {
      const txt = g.camDirector.toJSON();
      $('cd-out').value = txt;
      try { await navigator.clipboard.writeText(txt); } catch (e) {}
      this.syncCamDirector(g.camDirector);
    });
    on('cd-apply', 'click', () => {
      const txt = $('cd-in').value.trim() || $('cd-out').value.trim();
      if (txt && g.camDirector.loadJSON(txt)) g.camDirector.apply();
      this.syncCamDirector(g.camDirector);
    });
    // view director
    for (const k of ['height', 'distance', 'widthMargin', 'lookHeight', 'sideFollow', 'fov']) {
      on('vd-' + k, 'input', () => {
        const v = parseFloat($('vd-' + k).value);
        g.fightCam.params[k] = v;
        $('vd-' + k + '-v').textContent = v.toFixed(2);
      });
    }
    on('vd-reset', 'click', () => { g.fightCam.reset(); this.syncViewSliders(); });
    on('vd-copy', 'click', async () => {
      const txt = JSON.stringify(g.fightCam.params, null, 2);
      $('vd-out').value = txt;
      try { await navigator.clipboard.writeText(txt); } catch (e) {}
    });
    on('vd-apply', 'click', () => {
      try { Object.assign(g.fightCam.params, JSON.parse($('vd-out').value || $('vd-in').value || '{}')); this.syncViewSliders(); } catch (e) { $('vd-out').value = 'invalid JSON'; }
    });
    // help toggle
    on('btn-help', 'click', () => $('help').classList.toggle('hidden'));
    on('help-close', 'click', () => $('help').classList.add('hidden'));
    // panel toggles row
    for (const [btn, panel] of [['tg-camera', 'panel-camera'], ['tg-view', 'panel-view'], ['tg-export', 'panel-export']]) {
      on(btn, 'click', () => $(panel).classList.toggle('hidden'));
    }
    // keyboard shortcuts
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Backquote') { g.editor.toggleVisible(); e.preventDefault(); }
      if (e.code === 'Backslash') { g.toggleTraining(); e.preventDefault(); }
      if (e.code === 'Escape') { if (g.state === 'fight') g.pause(); else if (g.state === 'paused') g.resume(); }
    });
    // unlock audio on first gesture
    const unlock = () => { g.audio.ensure(); };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
  }
}
