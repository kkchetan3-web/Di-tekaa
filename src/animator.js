// animator.js — procedural animation clips (all original, code-authored)
// Rig faces +Z. Joint base rotations are zero; clips write Euler angles each frame.

import * as THREE from 'three';

const JOINTS = ['hips','spine','chest','neck','head','shoulderL','armL','elbowL','wristL','shoulderR','armR','elbowR','wristR','thighL','kneeL','ankleL','thighR','kneeR','ankleR','fingerR','glasses'];

const R = (j, x, y, z) => { j.rotation.set(x, y, z); };

export const CLIPS = {
  idle: {
    dur: 2.4, loop: true, blend: 10,
    fn(J, ph, dt, model) {
      const b = Math.sin(ph * Math.PI * 2);
      R(J.spine, 0.06 + b * 0.02, 0, 0);
      R(J.chest, 0.05, 0, 0);
      R(J.head, b * 0.03, Math.sin(ph * Math.PI * 2 * 0.5) * 0.06, 0);
      // guard arms
      R(J.armL, -0.75, 0.15, -0.25); R(J.elbowL, -1.5, 0, 0); R(J.wristL, 0, 0, 0.3);
      R(J.armR, -0.65, -0.15, 0.25); R(J.elbowR, -1.6, 0, 0); R(J.wristR, 0, 0, -0.3);
      R(J.thighL, 0.12, 0.06, 0); R(J.kneeL, 0.2, 0, 0);
      R(J.thighR, -0.14, -0.06, 0); R(J.kneeR, 0.18, 0, 0);
      J.hips.position.y = 0.95 - 0.02 + b * 0.012;
      if (model.charId === 'kaka') { R(J.fingerR, 0.4, 0, 0); } // finger half-raised in guard
    },
  },

  walkF: {
    dur: 0.62, loop: true, blend: 12,
    fn(J, ph, dt, model) {
      const s = Math.sin(ph * Math.PI * 2), c = Math.cos(ph * Math.PI * 2);
      R(J.thighL, s * 0.55, 0, 0); R(J.kneeL, Math.max(0, -c) * 1.0, 0, 0);
      R(J.thighR, -s * 0.55, 0, 0); R(J.kneeR, Math.max(0, c) * 1.0, 0, 0);
      R(J.ankleL, -Math.max(0, c) * 0.4, 0, 0); R(J.ankleR, Math.max(0, s) * 0.4, 0, 0);
      R(J.spine, 0.10, 0, 0); J.hips.position.y = 0.93 + Math.abs(c) * 0.03;
      R(J.armL, -0.5 + c * 0.25, 0.1, -0.2); R(J.elbowL, -1.3, 0, 0);
      R(J.armR, -0.5 - c * 0.25, -0.1, 0.2); R(J.elbowR, -1.3, 0, 0);
    },
  },
  walkB: {
    dur: 0.7, loop: true, blend: 12,
    fn(J, ph, dt, model) {
      const s = Math.sin(ph * Math.PI * 2), c = Math.cos(ph * Math.PI * 2);
      R(J.thighL, s * 0.4, 0, 0); R(J.kneeL, Math.max(0, c) * 0.9, 0, 0);
      R(J.thighR, -s * 0.4, 0, 0); R(J.kneeR, Math.max(0, -c) * 0.9, 0, 0);
      R(J.spine, 0.14, 0, 0); J.hips.position.y = 0.92 + Math.abs(s) * 0.03;
      R(J.armL, -0.8, 0.15, -0.25); R(J.elbowL, -1.6, 0, 0);
      R(J.armR, -0.7, -0.15, 0.25); R(J.elbowR, -1.7, 0, 0);
    },
  },
  jump: {
    dur: 0.4, loop: true, blend: 14,
    fn(J) {
      R(J.thighL, -0.7, 0, 0); R(J.kneeL, 1.3, 0, 0);
      R(J.thighR, -0.5, 0, 0); R(J.kneeR, 1.1, 0, 0);
      R(J.armL, -1.2, 0.2, -0.4); R(J.elbowL, -1.0, 0, 0);
      R(J.armR, -1.0, -0.2, 0.4); R(J.elbowR, -1.2, 0, 0);
      R(J.spine, 0.12, 0, 0);
    },
  },
  fall: {
    dur: 0.4, loop: true, blend: 8,
    fn(J) {
      R(J.thighL, 0.25, 0, 0); R(J.kneeL, 0.5, 0, 0);
      R(J.thighR, 0.1, 0, 0); R(J.kneeR, 0.35, 0, 0);
      R(J.armL, -2.4, 0.2, -0.5); R(J.elbowL, -0.6, 0, 0);
      R(J.armR, -2.2, -0.2, 0.5); R(J.elbowR, -0.8, 0, 0);
    },
  },
  crouch: {
    dur: 1.6, loop: true, blend: 14,
    fn(J, ph, dt, model) {
      const b = Math.sin(ph * Math.PI * 2) * 0.02;
      J.hips.position.y = 0.58 + b;
      R(J.thighL, -1.15, 0.1, 0); R(J.kneeL, 1.9, 0, 0); R(J.ankleL, -0.55, 0, 0);
      R(J.thighR, -1.0, -0.1, 0); R(J.kneeR, 1.75, 0, 0); R(J.ankleR, -0.5, 0, 0);
      R(J.spine, 0.35, 0, 0); R(J.chest, 0.1, 0, 0);
      R(J.armL, -0.9, 0.2, -0.3); R(J.elbowL, -1.7, 0, 0);
      R(J.armR, -0.8, -0.2, 0.3); R(J.elbowR, -1.8, 0, 0);
    },
  },
  block: {
    dur: 1.2, loop: true, blend: 18,
    fn(J, ph, dt, model) {
      const b = Math.sin(ph * Math.PI * 2) * 0.02;
      R(J.spine, -0.12 + b, 0, 0); R(J.head, 0.1, 0, 0);
      R(J.armL, -1.45, 0.45, -0.6); R(J.elbowL, -1.9, 0, 0); R(J.wristL, 0, 0, -0.5);
      R(J.armR, -1.35, -0.45, 0.6); R(J.elbowR, -2.0, 0, 0); R(J.wristR, 0, 0, 0.5);
      J.hips.position.y = 0.88;
      R(J.thighL, 0.18, 0.08, 0); R(J.kneeL, 0.3, 0, 0);
      R(J.thighR, -0.2, -0.08, 0); R(J.kneeR, 0.28, 0, 0);
    },
  },

  punch: {
    dur: 0.42, loop: false, blend: 22, attack: true,
    fn(J, ph, dt, model) {
      let sx, ex;
      if (ph < 0.38) { const k = ph / 0.38; sx = -0.4 - k * 0.2; ex = -1.9 - k * 0.25; }        // windup
      else if (ph < 0.62) { const k = (ph - 0.38) / 0.24; sx = -0.6 - k * 0.95; ex = -2.15 + k * 2.1; } // strike
      else { const k = (ph - 0.62) / 0.38; sx = -1.55 + k * 0.9; ex = -0.05 + k * 1.55; }       // recover
      R(J.armR, sx, -0.25, 0.12); R(J.elbowR, ex, 0, 0); R(J.wristR, 0, 0, -0.15);
      R(J.armL, -0.9, 0.2, -0.3); R(J.elbowL, -1.8, 0, 0);
      R(J.spine, 0.08, ph > 0.38 && ph < 0.7 ? -0.3 : 0.1, 0);
      R(J.head, 0.05, ph > 0.38 && ph < 0.7 ? -0.25 : 0, 0);
      J.hips.position.y = 0.94;
      R(J.thighL, 0.15, 0.05, 0); R(J.kneeL, 0.25, 0, 0);
      R(J.thighR, -0.25, -0.05, 0); R(J.kneeR, 0.3, 0, 0);
      if (model.charId === 'kaka') R(J.fingerR, ph > 0.38 ? 0 : 0.6, 0, 0); // Kaka punches with the pointing finger
    },
  },
  punch2: { // chain alt (left)
    dur: 0.4, loop: false, blend: 22, attack: true,
    fn(J, ph, dt, model) {
      let sx, ex;
      if (ph < 0.38) { const k = ph / 0.38; sx = -0.4 - k * 0.2; ex = -1.9 - k * 0.25; }
      else if (ph < 0.62) { const k = (ph - 0.38) / 0.24; sx = -0.6 - k * 0.95; ex = -2.15 + k * 2.1; }
      else { const k = (ph - 0.62) / 0.38; sx = -1.55 + k * 0.9; ex = -0.05 + k * 1.55; }
      R(J.armL, sx, 0.25, -0.12); R(J.elbowL, ex, 0, 0);
      R(J.armR, -0.9, -0.2, 0.3); R(J.elbowR, -1.8, 0, 0);
      R(J.spine, 0.08, ph > 0.38 && ph < 0.7 ? 0.3 : -0.1, 0);
      J.hips.position.y = 0.94;
      R(J.thighL, 0.15, 0.05, 0); R(J.kneeL, 0.25, 0, 0);
      R(J.thighR, -0.25, -0.05, 0); R(J.kneeR, 0.3, 0, 0);
    },
  },
  kick: {
    dur: 0.52, loop: false, blend: 20, attack: true,
    fn(J, ph, dt, model) {
      let tx, kx, sp;
      if (ph < 0.4) { const k = ph / 0.4; tx = -0.3 - k * 0.6; kx = 1.8 - k * 0.4; sp = 0.1 + k * 0.15; }
      else if (ph < 0.62) { const k = (ph - 0.4) / 0.22; tx = -0.9 - k * 0.75; kx = 1.4 - k * 1.3; sp = 0.25; }
      else { const k = (ph - 0.62) / 0.38; tx = -1.65 + k * 1.5; kx = 0.1 + k * 0.2; sp = 0.25 - k * 0.15; }
      R(J.thighR, tx, -0.08, 0); R(J.kneeR, kx, 0, 0); R(J.ankleR, sp, 0, 0);
      R(J.thighL, 0.12 + (ph < 0.62 ? 0.1 : 0), 0.05, 0); R(J.kneeL, 0.25, 0, 0);
      R(J.spine, ph < 0.62 ? -0.18 : -0.05, 0, 0);
      R(J.armL, -1.1, 0.3, -0.5); R(J.elbowL, -1.4, 0, 0);
      R(J.armR, -0.4, -0.3, 0.5); R(J.elbowR, -1.5, 0, 0);
      J.hips.position.y = 0.93;
    },
  },
  heavy: {
    dur: 0.72, loop: false, blend: 18, attack: true,
    fn(J, ph, dt, model) {
      let ax, ex;
      if (ph < 0.42) { const k = ph / 0.42; ax = -0.4 - k * 0.9; ex = -1.6 - k * 0.5; }
      else if (ph < 0.6) { const k = (ph - 0.42) / 0.18; ax = -1.3 - k * 0.5; ex = -2.1 + k * 1.9; }
      else { const k = (ph - 0.6) / 0.4; ax = -1.8 + k * 1.1; ex = -0.2 + k * 1.4; }
      R(J.armR, ax, -0.2, 0.25); R(J.elbowR, ex, 0, 0);
      R(J.armL, ax * 0.9, 0.2, -0.25); R(J.elbowL, ex * 0.92, 0, 0);
      R(J.spine, ph < 0.42 ? 0.25 + ph * 0.2 : ph < 0.6 ? 0.35 : 0.35 - (ph - 0.6) * 0.5, 0, 0);
      J.hips.position.y = ph < 0.42 ? 0.96 : 0.90;
      R(J.thighL, 0.2, 0.05, 0); R(J.kneeL, 0.35, 0, 0);
      R(J.thighR, -0.3, -0.05, 0); R(J.kneeR, 0.4, 0, 0);
    },
  },

  // Kaka special: DOUBLE ENGINE CHARGE — forward shoulder-charge sprint
  specialKaka: {
    dur: 0.75, loop: false, blend: 24, attack: true,
    fn(J, ph, dt, model) {
      const run = Math.sin(ph * Math.PI * 8);
      R(J.spine, 0.45, 0, 0); R(J.chest, 0.1, 0, 0); R(J.head, -0.2, 0, 0);
      R(J.armR, 0.5, -0.1, 0.15); R(J.elbowR, -1.9, 0, 0); // arm cocked back, shoulder leading
      R(J.armL, -1.9, 0.1, -0.2); R(J.elbowL, -0.6, 0, 0);
      R(J.thighL, -0.6 + run * 0.5, 0, 0); R(J.kneeL, 0.9 - run * 0.4, 0, 0);
      R(J.thighR, -0.6 - run * 0.5, 0, 0); R(J.kneeR, 0.9 + run * 0.4, 0, 0);
      J.hips.position.y = 0.88;
      if (J.fingerR) R(J.fingerR, 0, 0, 0);
    },
  },
  // Por special: RANN-FURY SPIN — whirling flail
  specialPor: {
    dur: 0.85, loop: false, blend: 30, attack: true, spin: true,
    fn(J, ph, dt, model) {
      R(J.armL, -1.5, 0, -1.35); R(J.elbowL, -0.4, 0, 0);
      R(J.armR, -1.5, 0, 1.35); R(J.elbowR, -0.4, 0, 0);
      R(J.spine, 0.2, 0, 0);
      R(J.thighL, 0.15, 0.1, 0); R(J.kneeL, 0.3, 0, 0);
      R(J.thighR, -0.15, -0.1, 0); R(J.kneeR, 0.3, 0, 0);
      J.hips.position.y = 0.92;
      model.spinY = ph * Math.PI * 8; // game rotates root
    },
  },

  hit: {
    dur: 0.34, loop: false, blend: 30,
    fn(J, ph, dt, model) {
      const k = Math.sin(Math.min(1, ph * 1.6) * Math.PI);
      R(J.spine, -0.35 * k, 0, 0.08 * k); R(J.head, -0.3 * k, 0.1 * k, 0);
      R(J.armL, -1.0 - 0.7 * k, 0.4, -0.7); R(J.elbowL, -1.2, 0, 0);
      R(J.armR, -0.8 - 0.6 * k, -0.4, 0.7); R(J.elbowR, -1.3, 0, 0);
      J.hips.position.y = 0.93;
      R(J.thighL, 0.3 * k + 0.1, 0, 0); R(J.kneeL, 0.4, 0, 0);
      R(J.thighR, -0.2 * k, 0, 0); R(J.kneeR, 0.35, 0, 0);
    },
  },
  ko: {
    dur: 0.6, loop: false, blend: 26,
    fn(J, ph, dt, model) {
      const k = Math.min(1, ph * 1.8);
      R(J.armL, -2.6 * k - 0.3, 0.3, -0.9); R(J.elbowL, -0.4, 0, 0);
      R(J.armR, -2.4 * k - 0.3, -0.3, 0.9); R(J.elbowR, -0.5, 0, 0);
      R(J.thighL, -0.5 * k, 0.15, 0); R(J.kneeL, 0.6 * k, 0, 0);
      R(J.thighR, -0.35 * k, -0.1, 0); R(J.kneeR, 0.5 * k, 0, 0);
      R(J.head, 0.3 * k, 0.2 * k, 0);
    },
  },

  // per-character victory / taunt / intro
  winKaka: {
    dur: 2.6, loop: true, blend: 10,
    fn(J, ph, dt, model) {
      const s = Math.sin(ph * Math.PI * 2);
      if (ph < 0.5) { // namaste + point up
        R(J.armR, -1.15, 0.55, 0.55); R(J.elbowR, -1.7, 0, 0);
        R(J.armL, -1.2, -0.55, -0.55); R(J.elbowL, -1.75, 0, 0);
        R(J.spine, 0.05, 0, 0); R(J.head, 0.06, Math.sin(ph * 12.566) * 0.08, 0);
      } else {
        const k = (ph - 0.5) / 0.5;
        R(J.armR, -2.4 + Math.sin(k * 9) * 0.25, -0.2, 0.2); R(J.elbowR, -0.4, 0, 0); // wave
        R(J.armL, -0.5, 0.2, -0.3); R(J.elbowL, -1.2, 0, 0);
        R(J.spine, 0.02, 0, 0);
      }
      J.hips.position.y = 0.95 + Math.abs(s) * 0.01;
    },
  },
  winPor: {
    dur: 1.6, loop: true, blend: 12,
    fn(J, ph, dt, model) {
      const s = Math.sin(ph * Math.PI * 2);
      R(J.armL, -2.3, 0.2, -0.6); R(J.elbowL, -1.9, 0, 0); // double flex
      R(J.armR, -2.3, -0.2, 0.6); R(J.elbowR, -1.9, 0, 0);
      R(J.spine, -0.08, s * 0.12, 0);
      R(J.thighL, 0.2, 0.1, 0); R(J.thighR, -0.2, -0.1, 0);
      J.hips.position.y = 0.93 + Math.abs(s) * 0.03;
    },
  },
  tauntKaka: {
    dur: 1.5, loop: false, blend: 14,
    fn(J, ph, dt, model) {
      if (ph < 0.45) { // adjusts glasses
        const k = ph / 0.45;
        R(J.armL, -2.35, -0.35, -0.25); R(J.elbowL, -1.1, 0, 0);
        R(J.armR, -0.7, -0.15, 0.25); R(J.elbowR, -1.7, 0, 0);
        if (J.glasses) J.glasses.position.y = 0.16 - Math.sin(k * Math.PI) * 0.01;
      } else { // ek point! — pointing finger
        const k = (ph - 0.45) / 0.55;
        R(J.armR, -1.5 + Math.sin(k * 14) * 0.06, -0.1, 0.1); R(J.elbowR, -0.1, 0, 0);
        R(J.armL, -0.6, 0.2, -0.3); R(J.elbowL, -1.5, 0, 0);
        if (J.fingerR) R(J.fingerR, 0, 0, 0);
        R(J.head, 0.02, 0, 0);
      }
      J.hips.position.y = 0.95;
    },
  },
  tauntPor: {
    dur: 1.1, loop: false, blend: 16,
    fn(J, ph, dt, model) {
      const s = Math.sin(ph * Math.PI * 5);
      R(J.hips, 0, 0, s * 0.3);           // hip wiggle
      R(J.armL, -0.3 + s * 0.3, 0.3, -0.9); R(J.elbowL, -0.7, 0, 0);
      R(J.armR, -0.3 - s * 0.3, -0.3, 0.9); R(J.elbowR, -0.7, 0, 0);
      R(J.head, -0.1, s * 0.15, 0);
      R(J.kneeL, 0.4, 0, 0); R(J.kneeR, 0.4, 0, 0);
      J.hips.position.y = 0.9;
    },
  },
  introKaka: {
    dur: 1.6, loop: false, blend: 12,
    fn(J, ph, dt, model) {
      R(J.armR, ph < 0.6 ? -1.5 : -1.6, -0.1, 0.1); R(J.elbowR, ph < 0.6 ? -0.3 : -0.1, 0, 0);
      if (J.fingerR) R(J.fingerR, ph < 0.6 ? 0 : 0, 0, 0);
      R(J.armL, -0.7, 0.2, -0.3); R(J.elbowL, -1.6, 0, 0);
      R(J.spine, 0.06, ph < 0.6 ? 0 : -0.15, 0);
      R(J.head, 0.05, ph < 0.6 ? 0 : 0.3, 0);
      J.hips.position.y = 0.95;
    },
  },
  introPor: {
    dur: 1.4, loop: false, blend: 14,
    fn(J, ph, dt, model) {
      const s = Math.sin(ph * Math.PI * 6);
      R(J.armL, -1.8 + s * 0.2, 0.2, -0.8); R(J.elbowL, -1.6, 0, 0);
      R(J.armR, -1.8 - s * 0.2, -0.2, 0.8); R(J.elbowR, -1.6, 0, 0);
      R(J.head, 0.15, s * 0.1, 0);
      J.hips.position.y = 0.9 + Math.abs(s) * 0.03;
    },
  },
  lose: {
    dur: 2.0, loop: true, blend: 8,
    fn(J, ph, dt, model) {
      const b = Math.sin(ph * Math.PI * 2);
      R(J.spine, 0.4, 0, 0); R(J.head, 0.35, 0, 0);
      R(J.armL, -0.2, 0.1, -0.15); R(J.elbowL, -0.3, 0, 0);
      R(J.armR, -0.2, -0.1, 0.15); R(J.elbowR, -0.3, 0, 0);
      J.hips.position.y = 0.88 + b * 0.01;
      R(J.kneeL, 0.5, 0, 0); R(J.kneeR, 0.5, 0, 0);
    },
  },
};

export class Animator {
  constructor(model) {
    this.model = model;
    this.current = null;
    this.t = 0;
    this.done = false;
    this.onDone = null;
    this.blendJoints = null;
  }
  play(name, { restart = true, onDone = null } = {}) {
    const clip = CLIPS[name];
    if (!clip) return;
    if (this.current === clip && !restart) return;
    // capture current rotations for blending
    this.blendJoints = {};
    for (const jn of JOINTS) {
      const j = this.model.j[jn];
      if (j) this.blendJoints[jn] = { x: j.rotation.x, y: j.rotation.y, z: j.rotation.z, hy: j.position.y };
    }
    this.current = clip;
    this.t = restart ? 0 : this.t;
    this.done = false;
    this.onDone = onDone;
    this.model.spinY = 0;
  }
  get name() { return this.current ? Object.keys(CLIPS).find(k => CLIPS[k] === this.current) : null; }
  update(dt) {
    const clip = this.current;
    const J = this.model.j;
    // reset joints each frame
    for (const jn of JOINTS) { const j = J[jn]; if (j) { j.rotation.set(0, 0, 0); } }
    J.hips.position.y = 0.95;
    this.model.spinY = 0;
    if (!clip) return;
    this.t += dt;
    let ph = this.t / clip.dur;
    if (clip.loop) ph %= 1;
    else if (ph >= 1) { ph = 1; if (!this.done) { this.done = true; if (this.onDone) this.onDone(); } }
    clip.fn(J, ph, dt, this.model);
    // blend from previous clip
    if (this.blendJoints) {
      const k = Math.min(1, dt * (clip.blend || 12));
      for (const jn of JOINTS) {
        const j = J[jn]; const b = this.blendJoints[jn];
        if (!j || !b) continue;
        j.rotation.x = b.x + (j.rotation.x - b.x) * k;
        j.rotation.y = b.y + (j.rotation.y - b.y) * k;
        j.rotation.z = b.z + (j.rotation.z - b.z) * k;
        if (jn === 'hips') j.position.y = b.hy + (j.position.y - b.hy) * k;
      }
      if (k >= 1) this.blendJoints = null;
    }
    if (clip.spin && this.model.spinY) {
      this.model.group.rotation.y = (this.model.baseRotY || 0) + this.model.spinY;
    }
  }
  forceDone() { this.done = true; }
}
