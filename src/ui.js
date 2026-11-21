// ui.js — DOM layer, rebuilt to the verified original design (docs/06 findings)

const $ = (id) => document.getElementById(id);
const on = (id, ev, fn) => { const el = $(id); if (el) el.addEventListener(ev, fn); };

export class UI {
  constructor(game) {
    this.game = game;
    this.pickingSlot = 'p1';
    this._bt = null;
  }

  // ---- screens -------------------------------------------------------------
  // verified flow: loadScreen → boot (arena choice + PLAY) → landing → fight
  showLoading(done) {
    const ls = $('loadScreen');
    if (done) ls.classList.add('done');
    else ls.classList.remove('done');
  }

  showBoot() {
    document.body.classList.remove('selecting');
    $('loadScreen').classList.add('done');
    $('boot').classList.remove('hidden');
    $('landing').classList.add('hidden');
  }

  showLanding() {
    document.body.classList.add('selecting');
    document.body.classList.remove('fighting', 'paused');
    $('boot').classList.add('hidden');
    $('landing').classList.remove('hidden');
    $('pauseMenu').style.display = 'none';
    $('replayBtn').style.display = 'none';
    $('roundBanner').classList.remove('show');
    $('stageTag').textContent = '';
  }

  showFight() {
    document.body.classList.remove('selecting');
    document.body.classList.add('fighting');
    $('landing').classList.add('hidden');
    $('boot').classList.add('hidden');
  }

  setBootReady(ready) {
    for (const id of ['chooseArena1', 'chooseArena2', 'chooseArena3']) {
      const el = $(id);
      if (el) el.disabled = !ready;
    }
    const p = $('playBtn');
    if (p) p.disabled = !ready;
    if (ready) $('bootMessage').textContent = 'Choose your arena';
  }

  setBootArena(stageId) {
    for (const [id, st] of [['chooseArena1', 'assembly'], ['chooseArena2', 'path'], ['chooseArena3', 'miramar']]) {
      const el = $(id);
      if (el) el.classList.toggle('on', st === stageId);
    }
  }

  // ---- landing / select ------------------------------------------------------
  buildLanding() {
    const g = this.game;
    const row = $('ldRow');
    row.innerHTML = '';
    for (const c of g.roster) {
      const el = document.createElement('button');
      el.className = 'ld-card';
      el.dataset.id = c.id;
      el.innerHTML = `<img alt="${c.name}"/><div class="nm">${c.name}</div><div class="tag t1 hidden">1P</div><div class="tag tc hidden">CPU</div>`;
      el.addEventListener('click', () => { g.audio.menuMove(); g.pickFighter(c.id); });
      row.appendChild(el);
    }
    for (let i = 0; i < 2; i++) {
      const el = document.createElement('div');
      el.className = 'ld-card locked';
      el.innerHTML = `<div class="big">🔒</div><div class="nm">SOON</div>`;
      row.appendChild(el);
    }
    const stages = [['assembly', 'ASSEMBLY'], ['path', 'PEOPLES PATH'], ['miramar', 'MIRAMAR']];
    const sc = $('ldStageChips');
    sc.innerHTML = '';
    for (const [id, label] of stages) {
      const b = document.createElement('button');
      b.className = 'ld-chip';
      b.dataset.stage = id;
      b.textContent = label;
      b.addEventListener('click', () => { g.audio.menuMove(); g.stageId = id; this.syncLanding(); });
      sc.appendChild(b);
    }
    const dc = $('ldDiffChips');
    dc.innerHTML = '';
    for (const d of ['easy', 'normal', 'hard']) {
      const b = document.createElement('button');
      b.className = 'ld-chip';
      b.dataset.diff = d;
      b.textContent = d.toUpperCase();
      b.addEventListener('click', () => { g.audio.menuMove(); g.difficulty = d; this.syncLanding(); });
      dc.appendChild(b);
    }
    document.querySelectorAll('.ld-tab').forEach(t => t.addEventListener('click', () => {
      g.audio.menuMove();
      this.pickingSlot = t.dataset.slot;
      this.syncLanding();
    }));
    $('ldRandom').addEventListener('click', () => {
      g.audio.menuSelect();
      const id = g.roster[Math.floor(Math.random() * g.roster.length)].id;
      g.pickFighter(id);
    });
    on('btnFight', 'click', () => { if (!$('btnFight').disabled) { g.audio.menuSelect(); g.startFight('cpu'); } });
    on('btnFriend', 'click', () => { g.audio.menuSelect(); g.startFight('2p'); });
    this.syncLanding();
  }

  syncLanding() {
    const g = this.game;
    document.querySelectorAll('.ld-tab').forEach(t => t.classList.toggle('on', t.dataset.slot === this.pickingSlot));
    document.querySelectorAll('.ld-card[data-id]').forEach(card => {
      const id = card.dataset.id;
      const isP1 = id === g.pickP1, isP2 = id === g.pickP2;
      card.classList.toggle('p1', isP1);
      card.classList.toggle('cpu', isP2);
      card.querySelector('.tag.t1').classList.toggle('hidden', !isP1);
      card.querySelector('.tag.tc').classList.toggle('hidden', !isP2);
    });
    document.querySelectorAll('#ldStageChips .ld-chip').forEach(c => c.classList.toggle('on', c.dataset.stage === g.stageId));
    document.querySelectorAll('#ldDiffChips .ld-chip').forEach(c => c.classList.toggle('on', c.dataset.diff === g.difficulty));
    const r1 = g.roster.find(r => r.id === g.pickP1), r2 = g.roster.find(r => r.id === g.pickP2);
    $('ldName1').textContent = r1 ? r1.name : '—';
    $('ldName2').textContent = r2 ? r2.name : '—';
    $('ldName1Role').textContent = '1P · YOU';
    $('ldName2Role').textContent = g.mode === '2p' ? 'P2' : 'CPU';
    const ready = g.fightersReady;
    $('btnFight').disabled = !ready;
    $('btnFriend').disabled = !ready;
    $('ldBusy').classList.toggle('show', !ready);
  }

  toast(text, ms = 1600) {
    const t = $('ldToast');
    t.textContent = text;
    t.classList.add('show');
    clearTimeout(this._toastT);
    this._toastT = setTimeout(() => t.classList.remove('show'), ms);
  }

  setPortraits(p1url, p2url) {
    if (p1url) { $('p1Portrait').src = p1url; $('p1Portrait').hidden = false; }
    if (p2url) { $('p2Portrait').src = p2url; $('p2Portrait').hidden = false; }
  }

  // ---- fight HUD -------------------------------------------------------------
  setNames(n1, n2) { $('p1Name').textContent = n1; $('p2Name').textContent = n2; }
  setStageTag(t) { $('stageTag').textContent = t || ''; }

  setHealth(side, pct) {
    const el = $(side === 1 ? 'p1Health' : 'p2Health');
    el.style.width = Math.max(0, pct) + '%';
    el.classList.toggle('mid', pct < 60 && pct >= 30);   // verified thresholds 30–60
    el.classList.toggle('low', pct < 30);                 // verified <30 (docs/06 §5.5)
  }

  flashBar(side) {
    const el = $(side === 1 ? 'p1Bar' : 'p2Bar');
    el.classList.remove('hurt'); void el.offsetWidth; el.classList.add('hurt');
    const wrap = $(side === 1 ? 'barWrap1' : 'barWrap2');
    wrap.style.setProperty('--shake', '6px');
    wrap.classList.remove('hitShake'); void wrap.offsetWidth; wrap.classList.add('hitShake');
  }

  setMeter(side, val, ready) {
    const el = $(side === 1 ? 'p1Meter' : 'p2Meter');
    el.style.width = val + '%';
    $(side === 1 ? 'p1MeterWrap' : 'p2MeterWrap').classList.toggle('ready', !!ready);
    // siren ambiance while meter is ready (inferred trigger, verified CSS: docs/06 §4.4)
    if (side === 1) document.body.classList.toggle('special-amb', !!ready);
  }

  setRounds(w1, w2) {
    const need = this.game.roundsToWin || 2;
    const pips1 = $('p1Pips').children, pips2 = $('p2Pips').children;
    for (let i = 0; i < pips1.length; i++) {
      pips1[i].classList.toggle('on', i < w1);
      pips2[i].classList.toggle('on', i < w2);
    }
  }

  setTimer(t) {
    $('roundClock').textContent = String(Math.max(0, Math.ceil(t))).padStart(2, '0');
    $('roundText').classList.toggle('low', t <= 10.5 && t > 0);
  }

  setRoundLabel(r) { $('roundLabel').textContent = 'ROUND ' + r; }

  banner(text, big = false, dur = 1.4) {
    const b = $('roundBanner');
    b.textContent = text;
    b.classList.toggle('big', big);
    b.classList.add('show');
    clearTimeout(this._bt);
    this._bt = setTimeout(() => b.classList.remove('show'), dur * 1000);
  }

  // verified special cinematics: letterbox + title card + flash (docs/06 §4.4)
  specialCinematic(moveName) {
    document.body.classList.add('special-on');
    const t = $('specialTitle');
    t.textContent = moveName;
    t.classList.remove('show'); void t.offsetWidth; t.classList.add('show');
    const f = $('specialFlash');
    f.classList.remove('go'); void f.offsetWidth; f.classList.add('go');
    setTimeout(() => document.body.classList.remove('special-on'), 1500);
  }

  // ---- panels ----------------------------------------------------------------
  syncCamDirector(cd) {
    $('cdCount').textContent = `${cd.keys.length} keys`;
  }

  syncViewSliders() {
    const p = this.game.fightCam.params;
    const set = (id, key) => {
      const el = $(id);
      if (el) el.value = p[key];
      const lab = $(id + 'v');
      if (lab) lab.textContent = (+p[key]).toFixed(2);
    };
    set('vdY', 'height'); set('vdMinZ', 'distance'); set('vdMargin', 'widthMargin');
    set('vdLookY', 'lookHeight'); set('vdFollow', 'sideFollow'); set('vdFov', 'fov');
  }

  bindAll() {
    const g = this.game;
    // boot
    const arenaBtns = [['chooseArena1', 'assembly'], ['chooseArena2', 'path'], ['chooseArena3', 'miramar']];
    for (const [id, stage] of arenaBtns) on(id, 'click', () => { g.audio.ensure(); g.audio.menuMove(); g.stageId = stage; this.setBootArena(stage); });
    on('playBtn', 'click', () => { g.audio.menuSelect(); g.showLanding(); });
    this.buildLanding();
    // hud
    on('pauseBtn', 'click', () => g.pause());
    on('btnResume', 'click', () => g.resume());
    on('btnRestart', 'click', () => g.restartMatch());
    on('btnQuit', 'click', () => g.quitToSelect());
    on('replayBtn', 'click', () => { g.audio.menuSelect(); g.restartMatch(); });
    on('audioBtn', 'click', () => {
      g.audio.setMuted(!g.audio.muted);
      $('audioBtn').textContent = g.audio.muted ? '🔇' : '🔊';
    });
    on('audioVol', 'input', () => { g.audio.ensure(); g.audio.setVolume($('audioVol').value / 100); });
    on('fsBtn', 'click', () => {
      if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen();
    });
    // camera director (verified ids)
    on('cdPlay', 'click', () => { g.camDirector.playOrbit({ center: g.fightersMidpoint() }); this.syncCamDirector(g.camDirector); });
    on('cdPreview', 'click', () => { g.camDirector.preview(); this.syncCamDirector(g.camDirector); });
    on('cdFreeze', 'click', () => { g.camDirector.freeze(); this.syncCamDirector(g.camDirector); });
    on('cdStep', 'click', () => {
      const s = g.camDirector.step(1);
      if (s >= 0 && g.camDirector.keys[s]) {
        const k = g.camDirector.keys[s];
        g.camera.position.set(...k.pos);
        g.camDirector._lastLookVec = new g.THREE.Vector3(...k.look);
        g.camera.lookAt(...k.look);
      }
      this.syncCamDirector(g.camDirector);
    });
    on('cdAdd', 'click', () => { g.camDirector.addKey({ center: g.fightersMidpoint() }); this.syncCamDirector(g.camDirector); });
    on('cdUndo', 'click', () => { g.camDirector.undo(); this.syncCamDirector(g.camDirector); });
    on('cdClear', 'click', () => { g.camDirector.clear(); this.syncCamDirector(g.camDirector); });
    on('cdCopy', 'click', async () => {
      const txt = g.camDirector.toJSON();
      $('cdOut').value = txt;
      try { await navigator.clipboard.writeText(txt); } catch (e) {}
    });
    on('cdApply', 'click', () => {
      const txt = $('cdIn').value.trim() || $('cdOut').value.trim();
      if (txt && g.camDirector.loadJSON(txt)) g.camDirector.apply();
      this.syncCamDirector(g.camDirector);
    });
    // view director (verified ids)
    const vdMap = { vdY: 'height', vdMinZ: 'distance', vdMargin: 'widthMargin', vdLookY: 'lookHeight', vdFollow: 'sideFollow', vdFov: 'fov' };
    for (const [id, key] of Object.entries(vdMap)) {
      on(id, 'input', () => {
        const v = parseFloat($(id).value);
        g.fightCam.params[key] = v;
        $(id + 'v').textContent = v.toFixed(2);
      });
    }
    on('vdReset', 'click', () => { g.fightCam.reset(); this.syncViewSliders(); });
    on('vdCopy', 'click', async () => {
      const txt = JSON.stringify(g.fightCam.params, null, 2);
      $('vdOut').value = txt;
      try { await navigator.clipboard.writeText(txt); } catch (e) {}
    });
    on('vdApply', 'click', () => {
      try { Object.assign(g.fightCam.params, JSON.parse($('vdOut').value || '{}')); this.syncViewSliders(); } catch (e) { $('vdOut').value = 'invalid JSON'; }
    });
    // keyboard shortcuts (verified: backtick toggles arena panel, backslash training, Esc pause)
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Backquote') {
        document.body.classList.toggle('arena-open');
        e.preventDefault();
      }
      if (e.code === 'Backslash') { g.toggleTraining(); e.preventDefault(); }
      if (e.code === 'Escape') { if (g.state === 'fight') g.pause(); else if (g.state === 'paused') g.resume(); }
    });
    // touch controls (verified: order GRAB/DI TEKA/PUNCH/KICK; GRAB = heavy key — docs/06 §5.11)
    this.bindTouch(g);
    // unlock audio on first gesture
    const unlock = () => g.audio.ensure();
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    // iOS tip
    if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
      setTimeout(() => { $('fsTip').classList.add('show'); setTimeout(() => $('fsTip').classList.remove('show'), 5000); }, 1200);
    }
  }

  bindTouch(g) {
    const stick = $('tcStick'), knob = $('tcKnob');
    if (!stick) return;
    const setKnob = (dx, dy) => { knob.style.transform = `translate(${dx}px, ${dy}px)`; };
    let active = false;
    const handle = (e) => {
      const r = stick.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      let dx = e.clientX - cx, dy = e.clientY - cy;
      const max = r.width * 0.35;
      const len = Math.hypot(dx, dy);
      if (len > max) { dx = dx / len * max; dy = dy / len * max; }
      setKnob(dx, dy);
      g.touchInput.left = dx < -max * 0.3;
      g.touchInput.right = dx > max * 0.3;
      g.touchInput.up = dy < -max * 0.55;
      g.touchInput.down = dy > max * 0.55;
    };
    stick.addEventListener('pointerdown', (e) => { active = true; stick.setPointerCapture(e.pointerId); handle(e); });
    stick.addEventListener('pointermove', (e) => { if (active) handle(e); });
    const end = () => {
      active = false; setKnob(0, 0);
      g.touchInput.left = g.touchInput.right = g.touchInput.up = g.touchInput.down = false;
    };
    stick.addEventListener('pointerup', end);
    stick.addEventListener('pointercancel', end);
    const tapBtn = (id, key) => {
      const el = $(id);
      if (!el) return;
      el.addEventListener('pointerdown', (e) => { e.preventDefault(); g.touchInput[key + 'P'] = true; el.classList.add('on'); g.audio.ensure(); });
      const off = () => { g.touchInput[key + 'P'] = false; el.classList.remove('on'); };
      el.addEventListener('pointerup', off);
      el.addEventListener('pointercancel', off);
      el.addEventListener('pointerleave', off);
    };
    tapBtn('tcPunch', 'punch');
    tapBtn('tcKick', 'kick');
    tapBtn('tcGrab', 'grab');
    tapBtn('tcSuper', 'special');
  }
}
