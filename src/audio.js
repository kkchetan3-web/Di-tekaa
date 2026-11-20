// audio.js — WebAudio SFX synthesis engine + voice-clip player (all audio original/procedural)

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.ambienceNodes = [];
    this.clipCache = new Map();
    this.clipManifest = {};
    this.lastPlay = new Map();
    this._loadedManifest = false;
  }

  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.9;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  setMuted(m) { this.muted = m; if (this.master) this.master.gain.value = m ? 0 : 0.9; }

  // ---- low-level helpers -------------------------------------------------
  _noiseBuffer(seconds = 1) {
    const ctx = this.ensure();
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) { // pinkish noise
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      d[i] = last * 3.2 + white * 0.25;
    }
    return buf;
  }

  _noise({ dur = 0.15, type = 'bandpass', freq = 900, q = 1, gain = 0.5, sweep = 0, attack = 0.002, when = 0 }) {
    const ctx = this.ensure();
    const src = ctx.createBufferSource();
    src.buffer = this._noiseBuffer(Math.max(0.5, dur + 0.1));
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain();
    const t0 = ctx.currentTime + when;
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    if (sweep) f.frequency.exponentialRampToValueAtTime(Math.max(40, freq + sweep), t0 + dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(t0); src.stop(t0 + dur + 0.05);
  }

  _tone({ freq = 200, dur = 0.15, type = 'sine', gain = 0.5, slide = 0, attack = 0.002, when = 0 }) {
    const ctx = this.ensure();
    const o = ctx.createOscillator();
    o.type = type; o.frequency.value = freq;
    const g = ctx.createGain();
    const t0 = ctx.currentTime + when;
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
    o.connect(g).connect(this.master);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }

  _rateLimit(id, ms) {
    const now = performance.now();
    if ((this.lastPlay.get(id) || 0) + ms > now) return false;
    this.lastPlay.set(id, now);
    return true;
  }

  // ---- SFX palette --------------------------------------------------------
  whoosh()  { if (!this._rateLimit('w', 60)) return; this._noise({ dur: .18, freq: 700, q: 2, gain: .22, sweep: 900 }); }
  punch()   { this._noise({ dur: .09, freq: 1400, q: .8, gain: .5, sweep: -800 }); this._tone({ freq: 130, dur: .09, type: 'sine', gain: .55, slide: -60 }); }
  kick()    { this._noise({ dur: .12, freq: 900, q: .8, gain: .55, sweep: -500 }); this._tone({ freq: 95, dur: .12, type: 'sine', gain: .6, slide: -45 }); }
  heavy()   { this._noise({ dur: .2, freq: 500, q: .7, gain: .7, sweep: -300 }); this._tone({ freq: 70, dur: .22, type: 'sine', gain: .8, slide: -30 }); this._tone({ freq: 55, dur: .18, type: 'triangle', gain: .4, slide: -20 }); }
  special() { this._noise({ dur: .5, freq: 300, q: 1.5, gain: .5, sweep: 1600 }); this._tone({ freq: 220, dur: .5, type: 'sawtooth', gain: .25, slide: 440 }); }
  hit()     { if (!this._rateLimit('h', 40)) return; this._noise({ dur: .07, freq: 2000, q: 1, gain: .35, sweep: -1200 }); this._tone({ freq: 180, dur: .07, type: 'square', gain: .18, slide: -90 }); }
  block()   { if (!this._rateLimit('b', 60)) return; this._noise({ dur: .07, freq: 3000, q: 3, gain: .3, sweep: -600 }); this._tone({ freq: 500, dur: .05, type: 'triangle', gain: .22, slide: -100 }); }
  ko()      { this._tone({ freq: 400, dur: .9, type: 'sawtooth', gain: .4, slide: -340 }); this._tone({ freq: 100, dur: 1.1, type: 'sine', gain: .8, slide: -55 }); this._noise({ dur: .6, freq: 400, q: .6, gain: .5, sweep: -320 }); }
  jump()    { this._tone({ freq: 180, dur: .12, type: 'sine', gain: .16, slide: 160 }); }
  land()    { this._noise({ dur: .06, freq: 350, q: .8, gain: .18 }); }
  roundBell() { this._tone({ freq: 660, dur: .8, type: 'sine', gain: .4 }); this._tone({ freq: 990, dur: .7, type: 'sine', gain: .18, when: .01 }); }
  menuMove()  { this._tone({ freq: 520, dur: .05, type: 'square', gain: .12 }); }
  menuSelect(){ this._tone({ freq: 700, dur: .08, type: 'square', gain: .16 }); this._tone({ freq: 1050, dur: .1, type: 'square', gain: .12, when: .06 }); }
  menuBack()  { this._tone({ freq: 420, dur: .08, type: 'square', gain: .14, slide: -120 }); }
  meterFull() { this._tone({ freq: 880, dur: .12, type: 'square', gain: .2 }); this._tone({ freq: 1320, dur: .18, type: 'square', gain: .2, when: .1 }); }
  tauntBark() { this._tone({ freq: 300, dur: .1, type: 'square', gain: .15, slide: 220 }); }

  // ---- ambience loops -----------------------------------------------------
  stopAmbience() {
    for (const n of this.ambienceNodes) { try { n.stop ? n.stop() : n.disconnect(); } catch (e) {} }
    this.ambienceNodes = [];
  }

  startAmbience(kind) {
    this.stopAmbience();
    const ctx = this.ensure();
    const src = ctx.createBufferSource();
    src.buffer = this._noiseBuffer(3);
    src.loop = true;
    const f = ctx.createBiquadFilter();
    const g = ctx.createGain();
    g.gain.value = kind === 'waves' ? 0.14 : kind === 'crowd' ? 0.10 : 0.05;
    f.type = 'lowpass'; f.frequency.value = kind === 'waves' ? 420 : kind === 'crowd' ? 300 : 900;
    src.connect(f).connect(g).connect(this.master);
    src.start();
    this.ambienceNodes.push(src);
    // slow LFO for waves / crowd swell
    const lfo = ctx.createOscillator();
    lfo.frequency.value = kind === 'waves' ? 0.17 : 0.09;
    const lg = ctx.createGain();
    lg.gain.value = g.gain.value * 0.6;
    lfo.connect(lg).connect(g.gain);
    lfo.start();
    this.ambienceNodes.push(lfo);
    if (kind === 'street') this._scheduleHorns();
  }

  _scheduleHorns() {
    if (!this.ctx) return;
    const next = () => {
      if (!this.ctx || this.muted || Math.random() < 0.4) { setTimeout(next, 3000 + Math.random() * 5000); return; }
      const f = 400 + Math.random() * 500;
      this._tone({ freq: f, dur: .3, type: 'sawtooth', gain: .05 });
      this._tone({ freq: f * 1.5, dur: .28, type: 'sawtooth', gain: .04, when: .12 });
      setTimeout(next, 4000 + Math.random() * 7000);
    };
    setTimeout(next, 2000);
  }

  // ---- voice clips (generated parody audio; missing files are skipped) -----
  async loadManifest() {
    if (this._loadedManifest) return;
    this._loadedManifest = true;
    try {
      const res = await fetch('assets/audio/manifest.json');
      if (res.ok) this.clipManifest = await res.json();
    } catch (e) { /* no manifest yet — clips optional */ }
  }

  async playClip(id, { rate = 1, gain = 1 } = {}) {
    const file = this.clipManifest[id];
    if (!file) return false;
    const ctx = this.ensure();
    if (this.muted) return true;
    try {
      let buf = this.clipCache.get(id);
      if (!buf) {
        const res = await fetch('assets/audio/' + file);
        if (!res.ok) return false;
        buf = await ctx.decodeAudioData(await res.arrayBuffer());
        this.clipCache.set(id, buf);
      }
      const src = ctx.createBufferSource();
      src.buffer = buf; src.playbackRate.value = rate;
      const g = ctx.createGain(); g.gain.value = gain;
      src.connect(g).connect(this.master);
      src.start();
      return true;
    } catch (e) { return false; }
  }
}

export const audio = new AudioEngine();
