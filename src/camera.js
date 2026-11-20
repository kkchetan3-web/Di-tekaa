// camera.js — auto fight camera (View Director params) + Camera Director (keyframes)

import * as THREE from 'three';
import { VIEW_DEFAULTS } from './config.js';

export class FightCamera {
  constructor(cam) {
    this.cam = cam;
    this.params = { ...VIEW_DEFAULTS };
    this.lookTarget = new THREE.Vector3(0, 1, 0);
    this.shake = 0;
  }
  reset() { this.params = { ...VIEW_DEFAULTS }; }

  update(dt, f1, f2, active = true) {
    const p = this.params;
    const mid = (f1.x + f2.x) / 2;
    const spread = Math.abs(f1.x - f2.x);
    const wantDist = Math.max(p.distance, spread + p.widthMargin * 1.5);
    const sideBias = THREE.MathUtils.clamp((f1.x - f2.x) * 0.5, -2, 2);
    const lookX = mid + p.sideFollow * 0.6 * sideBias;
    const ty = p.height;
    const k = Math.min(1, dt * 4.5);
    this._pos = this._pos || new THREE.Vector3(0, ty, wantDist);
    this._pos.lerp(new THREE.Vector3(lookX, ty, wantDist), k);
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt * 3);
      this._pos.x += (Math.random() - 0.5) * 0.08 * this.shake;
      this._pos.y += (Math.random() - 0.5) * 0.08 * this.shake;
    }
    this.cam.position.copy(this._pos);
    this._look = this._look || new THREE.Vector3(mid, p.lookHeight, 0);
    this._look.lerp(new THREE.Vector3(lookX, p.lookHeight, 0), k);
    this.cam.lookAt(this._look);
    if (active) {
      const wantFov = p.fov;
      if (Math.abs(this.cam.fov - wantFov) > 0.01) { this.cam.fov += (wantFov - this.cam.fov) * k; this.cam.updateProjectionMatrix(); }
    }
  }
}

export class CameraDirector {
  constructor(cam, fightCam) {
    this.cam = cam;
    this.fightCam = fightCam;
    this.mode = 'game';           // game | frozen | preview | applied
    this.keys = [];               // {pos:[x,y,z], look:[x,y,z], fov}
    this.selected = -1;
    this.orbit = { theta: Math.PI * 0.5, phi: 1.15, radius: 8 };
    this.previewT = 0;
    this.previewSegment = 0;
    this.sceneCenter = new THREE.Vector3(0, 1, 0);
    this.orbitTarget = null;      // fighter midpoint when orbiting during fight
  }

  // --- controls ------------------------------------------------------------
  playOrbit(ctx) { this.mode = 'orbit'; this._syncOrbitFromCam(ctx); }
  freeze() { this.mode = 'frozen'; }
  resumeGame() { this.mode = 'game'; }
  addKey(ctx) {
    const k = { pos: this.cam.position.toArray().map(v => +v.toFixed(3)), look: (this._lastLook || this.cam.lookAt ? this._lastLook || [0, 1, 0] : [0, 1, 0]).map(v => +v.toFixed(3)), fov: +this.cam.fov.toFixed(1) };
    if (this._lastLookVec) k.look = this._lastLookVec.toArray().map(v => +v.toFixed(3));
    if (ctx && ctx.center) k.look = [ctx.center.x, ctx.center.y, ctx.center.z].map(v => +v.toFixed(3));
    this.keys.push(k);
    this.selected = this.keys.length - 1;
    return k;
  }
  step(dir = 1) {
    if (!this.keys.length) return -1;
    this.selected = (this.selected + dir + this.keys.length) % this.keys.length;
    return this.selected;
  }
  undo() { this.keys.pop(); this.selected = Math.min(this.selected, this.keys.length - 1); }
  clear() { this.keys = []; this.selected = -1; }
  toJSON() { return JSON.stringify({ version: 1, keys: this.keys }, null, 2); }
  loadJSON(txt) {
    try {
      const o = JSON.parse(txt);
      if (!o || !Array.isArray(o.keys)) throw new Error('no keys');
      this.keys = o.keys.map(k => ({ pos: k.pos, look: k.look, fov: k.fov ?? 42 }));
      this.selected = this.keys.length ? 0 : -1;
      return true;
    } catch (e) { return false; }
  }
  apply() { if (this.keys.length >= 1) this.mode = 'applied'; }
  preview() { if (this.keys.length >= 1) { this.mode = 'preview'; this.previewT = 0; this.previewSegment = 0; } }

  _syncOrbitFromCam(ctx) {
    const c = this.cam.position;
    const t = ctx && ctx.center ? ctx.center : this.sceneCenter;
    const d = c.clone().sub(t);
    this.orbit.radius = d.length();
    this.orbit.theta = Math.atan2(d.x, d.z);
    this.orbit.phi = Math.acos(THREE.MathUtils.clamp(d.y / (d.length() || 1), -1, 1));
  }

  _orbitPos(center) {
    const o = this.orbit;
    const x = center.x + o.radius * Math.sin(o.phi) * Math.sin(o.theta);
    const y = center.y + o.radius * Math.cos(o.phi);
    const z = center.z + o.radius * Math.sin(o.phi) * Math.cos(o.theta);
    return new THREE.Vector3(x, Math.max(0.3, y), z);
  }

  _interpolateKeys(t01) {
    const n = this.keys.length;
    const seg = Math.floor(t01 * n) % n;
    const k0 = this.keys[seg], k1 = this.keys[(seg + 1) % n];
    let f = (t01 * n) % 1;
    f = f * f * (3 - 2 * f); // smoothstep
    const lerp3 = (a, b) => [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
    return { pos: lerp3(k0.pos, k1.pos), look: lerp3(k0.look, k1.look), fov: k0.fov + (k1.fov - k0.fov) * f, seg };
  }

  update(dt, ctx) {
    // ctx: {center} midpoint of fighters (or arena center in editor)
    const center = ctx && ctx.center ? ctx.center : this.sceneCenter;
    switch (this.mode) {
      case 'orbit': {
        this.cam.position.copy(this._orbitPos(center));
        this.cam.lookAt(center);
        this._lastLookVec = center.clone();
        break;
      }
      case 'frozen': break; // camera stays where the user dragged it
      case 'preview': {
        this.previewT += dt / 1.9;
        const r = this._interpolateKeys(this.previewT);
        this.previewSegment = r.seg;
        this.cam.position.set(...r.pos);
        this.cam.lookAt(...r.look);
        this.cam.fov = r.fov; this.cam.updateProjectionMatrix();
        if (this.previewT >= this.keys.length) this.previewT = 0;
        break;
      }
      case 'applied': {
        this.previewT += dt / 1.9;
        const r = this._interpolateKeys(this.previewT);
        this.cam.position.set(...r.pos);
        this.cam.lookAt(...r.look);
        this.cam.fov = r.fov; this.cam.updateProjectionMatrix();
        if (this.previewT >= this.keys.length) this.previewT = 0;
        break;
      }
      case 'game':
      default: break; // FightCamera drives it
    }
  }

  // drag-to-orbit support while frozen/orbit
  attachDrag(el, getContext) {
    let dragging = false, lx = 0, ly = 0;
    el.addEventListener('pointerdown', (e) => {
      if (this.mode !== 'orbit' && this.mode !== 'frozen') return;
      dragging = true; lx = e.clientX; ly = e.clientY;
    });
    window.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY;
      this.orbit.theta -= dx * 0.008;
      this.orbit.phi = THREE.MathUtils.clamp(this.orbit.phi - dy * 0.006, 0.15, 1.5);
    });
    window.addEventListener('pointerup', () => { dragging = false; });
    el.addEventListener('wheel', (e) => {
      if (this.mode !== 'orbit' && this.mode !== 'frozen') return;
      e.preventDefault();
      this.orbit.radius = THREE.MathUtils.clamp(this.orbit.radius + e.deltaY * 0.01, 2, 30);
    }, { passive: false });
  }
}
