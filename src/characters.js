// characters.js — original procedural caricature fighters (rig built in code)
// Every mesh here is generated geometry — no imported character assets.

import * as THREE from 'three';

const M = (c, opts = {}) => new THREE.MeshLambertMaterial({ color: c, ...opts });

function mesh(geo, mat, parent, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = false;
  if (parent) parent.add(m);
  return m;
}

const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const cyl = (rt, rb, h, seg = 10) => new THREE.CylinderGeometry(rt, rb, h, seg);
const sph = (r, seg = 14) => new THREE.SphereGeometry(r, seg, seg);
const cap = (r) => new THREE.SphereGeometry(r, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2);

function joint(parent, x = 0, y = 0, z = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  return g;
}

// ---------------------------------------------------------------------------
// Shared humanoid builder — rig faces +Z; game code rotates root by ±90°.
// ---------------------------------------------------------------------------
function buildHumanoid(o) {
  const skin = M(o.skin);
  const group = new THREE.Group();                    // root at feet, y=0

  const J = {};
  J.hips = joint(group, 0, 0.95, 0);

  // pelvis + kurta/shorts lower trunk
  const pelvis = mesh(box(0.34, 0.16, 0.22), M(o.pants), J.hips, 0, 0.02, 0);
  if (o.lowerOver) mesh(box(o.lowerOver.w, o.lowerOver.h, o.lowerOver.d), M(o.lowerOver.c), J.hips, 0, -0.02 - o.lowerOver.h / 2 + 0.14, 0);

  J.spine = joint(J.hips, 0, 0.10, 0);
  J.chest = joint(J.spine, 0, 0.22, 0);
  // torso mesh (tunic)
  const torso = mesh(box(0.38, 0.30, 0.24), M(o.shirt), J.chest, 0, 0.12, 0);
  if (o.upperOver) { // vest / jacket overlay
    const ov = mesh(box(o.upperOver.w, o.upperOver.h, o.upperOver.d), M(o.upperOver.c), J.chest, 0, o.upperOver.y ?? 0.10, 0);
    // buttons
    for (let i = 0; i < 3; i++) mesh(sph(0.016, 8), M(o.upperOver.btn || 0x2b2b2b), J.chest, 0, 0.02 + i * 0.09, o.upperOver.d / 2 + 0.005);
    // collar
    mesh(box(0.20, 0.05, 0.06), M(o.upperOver.c), J.chest, 0, 0.24, 0.10);
  }

  // neck + head
  J.neck = joint(J.chest, 0, 0.30, 0);
  J.head = joint(J.neck, 0, 0.06, 0);
  mesh(cyl(0.055, 0.06, 0.08), skin, J.head, 0, 0.0, 0);
  const head = mesh(sph(0.16), skin, J.head, 0, 0.14, 0);
  head.scale.set(1, 1.08, 0.95);

  // face
  const face = { };
  const eyeGeo = sph(0.032, 10), pupGeo = sph(0.014, 8);
  for (const s of [-1, 1]) {
    const e = mesh(eyeGeo, M(0xf6f6f6), J.head, s * 0.058, 0.16, 0.128);
    mesh(pupGeo, M(0x101010), e, 0, 0, 0.022);
    face['eye' + (s < 0 ? 'L' : 'R')] = e;
    const b = mesh(box(0.07, 0.016, 0.02), M(o.hairColor), J.head, s * 0.058, 0.215, 0.135);
    face['brow' + (s < 0 ? 'L' : 'R')] = b;
  }
  const mouth = mesh(box(0.085, 0.02, 0.015), M(0x5b2333), J.head, 0, 0.055, 0.148);
  face.mouth = mouth;
  mesh(new THREE.ConeGeometry(0.026, 0.06, 8), skin, J.head, 0, 0.115, 0.155).rotation.x = Math.PI / 2 - 0.25;
  J.face = face;

  // hair (character-specific callback may override)
  if (o.hair) o.hair(J.head, M, mesh);

  // arms: shoulder pivots on chest
  for (const s of ['L', 'R']) {
    const sd = s === 'L' ? -1 : 1;
    const sh = joint(J.chest, sd * 0.235, 0.20, 0);
    J['shoulder' + s] = sh;
    const arm = joint(sh, sd * 0.02, 0, 0);
    J['arm' + s] = arm;
    const upper = mesh(cyl(0.052, 0.048, 0.26), M(o.sleeveless && s === 'R' ? o.skin : o.sleeve || o.shirt), arm, 0, -0.14, 0);
    if (o.sleeveless) { // bare upper arm for sleeveless side — skin under shirt cap
      mesh(sph(0.055, 8), skin, arm, 0, -0.02, 0);
    }
    const elbow = joint(arm, 0, -0.28, 0);
    J['elbow' + s] = elbow;
    mesh(cyl(0.045, 0.04, 0.24), M(o.forearmSkin ? o.skin : o.sleeve || o.shirt), elbow, 0, -0.13, 0);
    const wrist = joint(elbow, 0, -0.27, 0);
    J['wrist' + s] = wrist;
    const hand = mesh(box(0.07, 0.10, 0.045), skin, wrist, 0, -0.06, 0);
    if (o.ring && s === 'R') mesh(new THREE.TorusGeometry(0.018, 0.006, 6, 10), M(0xd4af37, { emissive: 0x554400 }), wrist, 0.02, -0.045, 0);
    if (o.watch && s === 'L') mesh(new THREE.TorusGeometry(0.05, 0.012, 6, 12), M(0x222222), elbow, 0, -0.22, 0);
    // pointing index finger (right hand)
    if (o.pointer && s === 'R') {
      const fg = joint(wrist, 0, -0.11, 0.01);
      mesh(box(0.02, 0.09, 0.02), skin, fg, 0, -0.045, 0);
      J.fingerR = fg;
    }
  }

  // legs: pivots under pelvis
  for (const s of ['L', 'R']) {
    const sd = s === 'L' ? -1 : 1;
    const hip = joint(J.hips, sd * 0.105, -0.06, 0);
    J['thigh' + s] = hip;
    mesh(cyl(0.075, 0.06, 0.36), M(o.pants), hip, 0, -0.19, 0);
    if (o.shortPants) mesh(cyl(0.082, 0.07, 0.20), M(o.pants), hip, 0, -0.12, 0);
    const knee = joint(hip, 0, -0.40, 0);
    J['knee' + s] = knee;
    mesh(cyl(0.055, 0.048, 0.34), M(o.shinColor || o.pants), knee, 0, -0.18, 0);
    const ankle = joint(knee, 0, -0.36, 0);
    J['ankle' + s] = ankle;
    const foot = mesh(box(0.09, 0.05, 0.20), M(o.shoeColor), ankle, 0, -0.02, 0.05);
    foot.name = 'foot' + s;
    if (o.chappal) mesh(box(0.085, 0.012, 0.19), M(0x2e6fb0), ankle, 0, 0.012, 0.05);
  }

  if (o.extras) o.extras(J, mesh, box, cyl, sph, M);

  group.scale.setScalar(o.scale || 1);
  return { group, joints: J };
}

// ---------------------------------------------------------------------------
// Character definitions
// ---------------------------------------------------------------------------
function kakaHair(head, M, mesh) {
  const hair = mesh(cap(0.165), M(0x141414), head, 0, 0.155, -0.004);
  hair.rotation.x = 0.06;
  // side-part line (darker strip)
  mesh(new THREE.BoxGeometry(0.02, 0.005, 0.14), M(0x050505), head, -0.05, 0.24, 0.02).rotation.z = 0.28;
}

function porHair(head, M, mesh) {
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    mesh(sph(0.055, 8), M(0x0c0c0c), head, Math.cos(a) * 0.09, 0.20 + (i % 2) * 0.02, -0.02 + Math.sin(a) * 0.07);
  }
  mesh(sph(0.10, 8), M(0x0c0c0c), head, 0, 0.24, -0.02);
}

export const CHARACTER_BUILDERS = {
  kaka: () => buildHumanoid({
    skin: 0x9c6b47, shirt: 0xf2efe6, pants: 0xf2efe6, sleeve: 0xf2efe6,
    shoeColor: 0x4a2f1d, hairColor: 0x141414, scale: 1.0,
    upperOver: { w: 0.42, h: 0.34, d: 0.27, c: 0x8a8d90, y: 0.09, btn: 0x3a3d40 }, // grey Nehru vest
    lowerOver: { w: 0.40, h: 0.14, d: 0.25, c: 0xf2efe6 },                          // kurta hem
    hair: kakaHair, ring: true, watch: true, pointer: true,
    extras: (J, mesh, box, cyl, sph, M) => {
      // rimless glasses
      const gg = new THREE.Group();
      J.head.add(gg); gg.position.set(0, 0.16, 0.15);
      for (const s of [-1, 1]) mesh(new THREE.TorusGeometry(0.042, 0.005, 6, 16), M(0x777777), gg, s * 0.058, 0, 0);
      mesh(box(0.05, 0.006, 0.006), M(0x777777), gg, 0, 0.01, 0);
      J.glasses = gg;
    },
  }),

  por: () => buildHumanoid({
    skin: 0x7d4a2b, shirt: 0xc2312e, pants: 0x27343f, sleeveless: true, forearmSkin: true,
    shoeColor: 0x8a8f96, hairColor: 0x0c0c0c, scale: 0.95, chappal: true, shortPants: true,
    hair: porHair,
    extras: (J, mesh, box, cyl, sph, M) => {
      // gold chain
      mesh(new THREE.TorusGeometry(0.09, 0.012, 6, 16), M(0xd4af37, { emissive: 0x443300 }), J.chest, 0, 0.16, 0.11).rotation.x = Math.PI / 2.4;
      // angry thick brows handled in animator via face scale
      // gamallo (towel) over left shoulder
      const towel = mesh(box(0.16, 0.34, 0.04), M(0xe8e4da), J.shoulderL, -0.06, -0.10, 0);
      towel.rotation.z = 0.22;
    },
  }),
};

const MOODS = {
  neutral: { brow: 0, browY: 0, mouth: 1, mouthY: 0.02 },
  angry:   { brow: 0.38, browY: -0.012, mouth: 1.2, mouthY: 0.03 },
  hurt:    { brow: -0.3, browY: 0.01, mouth: 1.6, mouthY: 0.028 },
  happy:   { brow: -0.18, browY: 0.006, mouth: 1.5, mouthY: 0.032 },
  ko:      { brow: -0.2, browY: 0, mouth: 2.2, mouthY: 0.02 },
};

export class FighterModel {
  constructor(charId) {
    const built = CHARACTER_BUILDERS[charId]();
    this.group = built.group;
    this.j = built.joints;
    this.charId = charId;
    this.setMood('neutral');
  }

  setMood(mood) {
    const m = MOODS[mood] || MOODS.neutral;
    const f = this.j.face;
    if (!f) return;
    f.browL.rotation.z = -m.brow; f.browR.rotation.z = m.brow;
    f.browL.position.y = 0.215 + m.browY; f.browR.position.y = 0.215 + m.browY;
    f.mouth.scale.y = m.mouth; f.mouth.position.y = 0.055 - (m.mouth - 1) * 0.008;
  }

  // knockdown/lying: rotate whole body
  lieFlat(on) {
    if (on) {
      this.group.rotation.x = -Math.PI / 2 * 0.92;
      this.group.position.y = 0.14;
    } else {
      this.group.rotation.x = 0;
      this.group.position.y = 0;
    }
  }
}
