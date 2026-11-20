// arenas.js — three original procedural arenas + GLB import host + background image

import * as THREE from 'three';
import { GLTFLoader } from '../vendor/three/GLTFLoader.js';

const M = (c, o = {}) => new THREE.MeshLambertMaterial({ color: c, ...o });

function mesh(geo, mat, parent, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true; m.receiveShadow = true;
  if (parent) parent.add(m);
  return m;
}

function canvasTexture(draw, w = 256, h = 256) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  return t;
}

function posterTexture(title, sub, bg = '#f5f0dc', fg = '#8a2b1d') {
  return canvasTexture((ctx, w, h) => {
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = fg; ctx.lineWidth = 8; ctx.strokeRect(10, 10, w - 20, h - 20);
    ctx.fillStyle = fg; ctx.textAlign = 'center';
    ctx.font = 'bold 40px sans-serif';
    ctx.fillText(title, w / 2, h / 2 - 10);
    ctx.font = '22px sans-serif';
    ctx.fillText(sub, w / 2, h / 2 + 40);
  }, 256, 340);
}

// --- helpers ---------------------------------------------------------------
function palm(parent, x, z, h = 3.2) {
  const g = new THREE.Group(); g.position.set(x, 0, z); parent.add(g);
  const trunk = mesh(new THREE.CylinderGeometry(0.09, 0.16, h, 7), M(0x8a6d4a), g, 0, h / 2, 0);
  trunk.rotation.z = (Math.random() - 0.5) * 0.2;
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const fr = mesh(new THREE.ConeGeometry(0.16, 1.7, 4), M(0x2f7a3a), g, Math.cos(a) * 0.55, h + 0.18, Math.sin(a) * 0.55);
    fr.rotation.set(Math.sin(a) * 1.1 + Math.PI / 2, -a, 1.15);
    fr.castShadow = true;
  }
  return g;
}

function house(parent, x, z, w, h, d, color, rotY = 0) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rotY; parent.add(g);
  mesh(new THREE.BoxGeometry(w, h, d), M(color), g, 0, h / 2, 0);
  // roof (red mangalore tile)
  const roof = mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.78, h * 0.35, 4), M(0x9e3b2b), g, 0, h + h * 0.17, 0);
  roof.rotation.y = Math.PI / 4;
  // windows
  for (let i = 0; i < 2; i++) {
    mesh(new THREE.BoxGeometry(w * 0.16, h * 0.22, 0.02), M(0x3a4a5a), g, -w * 0.25 + i * w * 0.5, h * 0.55, d / 2 + 0.01);
  }
  mesh(new THREE.BoxGeometry(w * 0.18, h * 0.4, 0.02), M(0x5a3a2a), g, 0, h * 0.2, d / 2 + 0.01);
  return g;
}

// --- Arena 1: ASSEMBLY -------------------------------------------------------
function buildAssembly() {
  const g = new THREE.Group();
  const anim = [];

  const floor = mesh(new THREE.BoxGeometry(30, 0.3, 18), M(0xd8cfba), g, 0, -0.15, 0);
  // carpet strip
  mesh(new THREE.BoxGeometry(24, 0.05, 4.4), M(0x7d1f2e), g, 0, 0.03, 0).receiveShadow = true;

  // back wall with emblem + panels
  const wall = mesh(new THREE.BoxGeometry(30, 9, 0.6), M(0xefe7d2), g, 0, 4.5, -9);
  for (let i = -6; i <= 6; i++) {
    mesh(new THREE.BoxGeometry(1.7, 5.4, 0.1), M(i % 2 ? 0x6b4a2f : 0x5a3d26), g, i * 2.05, 4.6, -8.66);
  }
  const emblem = mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.06, 24), M(0xc9a13b), g, 0, 6.4, -8.6);
  emblem.rotation.x = Math.PI / 2;
  mesh(new THREE.SphereGeometry(0.3, 12, 12), M(0x14327a), g, 0, 6.4, -8.5);

  // speaker dais at back
  mesh(new THREE.BoxGeometry(5, 0.8, 2), M(0x7a5a33), g, 0, 0.4, -7.2);
  mesh(new THREE.BoxGeometry(1.4, 1.1, 0.5), M(0x5d4426), g, 0, 1.35, -7.6); // lectern
  // side benches (members)
  for (let r = 0; r < 2; r++) {
    for (let s = -3; s <= 3; s++) {
      if (Math.abs(s) < 1) continue;
      const bench = mesh(new THREE.BoxGeometry(1.6, 0.5, 0.7), M(0x7a5a33), g, s * 2.4, 0.55 + r * 0.7, -4.6 + r * 2.4);
      const dude = mesh(new THREE.SphereGeometry(0.22, 8, 8), M(0xf2efe6), g, s * 2.4, 1.05 + r * 0.7, -4.75 + r * 2.4);
      dude.castShadow = false;
      mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.4, 6), M(0xf2efe6), g, s * 2.4, 0.85 + r * 0.7, -4.75 + r * 2.4).castShadow = false;
    }
  }
  // flags
  const flag = (x, colors) => {
    const pole = mesh(new THREE.CylinderGeometry(0.04, 0.04, 6.4, 6), M(0x888888), g, x, 3.2, -8.2);
    const cloth = new THREE.Group(); cloth.position.set(x, 5.6, -8.1); g.add(cloth);
    for (let i = 0; i < colors.length; i++) {
      mesh(new THREE.BoxGeometry(1.7, 0.4, 0.02), M(colors[i], { side: THREE.DoubleSide }), cloth, 0.87, (colors.length - 1) * 0.2 - i * 0.4, 0).castShadow = false;
    }
    anim.push({ flag: cloth, base: x });
    return cloth;
  };
  flag(-4.2, [0xff9933, 0xffffff, 0x138808]);
  flag(4.2, [0xffe04d, 0xffffff]);

  // ceiling strip lights
  for (let i = -2; i <= 2; i++) mesh(new THREE.BoxGeometry(3.2, 0.1, 0.5), M(0xfff2cc, { emissive: 0x555030 }), g, 0, 8.4, i * 3);

  // seating gallery sides
  mesh(new THREE.BoxGeometry(0.6, 6, 18), M(0xd9cfb4), g, -14.7, 3, 0);
  mesh(new THREE.BoxGeometry(0.6, 6, 18), M(0xd9cfb4), g, 14.7, 3, 0);

  return {
    group: g,
    lights: () => {
      const L = [];
      const hemi = new THREE.HemisphereLight(0xfff4e0, 0x8a8070, 0.85);
      const dir = new THREE.DirectionalLight(0xffe8c0, 1.0); dir.position.set(6, 10, 4);
      dir.castShadow = true; dir.shadow.mapSize.set(1024, 1024);
      dir.shadow.camera.left = -14; dir.shadow.camera.right = 14; dir.shadow.camera.top = 10; dir.shadow.camera.bottom = -10;
      const spot = new THREE.SpotLight(0xffffff, 60, 30, 0.5, 0.5); spot.position.set(0, 8.2, -3); spot.target.position.set(0, 0, 0);
      L.push(hemi, dir, spot, spot.target);
      return L;
    },
    update(dt, t) {
      for (const a of anim) {
        a.flag.rotation.z = Math.sin(t * 2 + a.base) * 0.06;
        a.flag.rotation.y = Math.sin(t * 1.3 + a.base) * 0.08;
      }
    },
    bg: 0x2c2418,
  };
}

// --- Arena 2: PEOPLES PATH ----------------------------------------------------
function buildPath() {
  const g = new THREE.Group();
  const anim = [];

  const road = mesh(new THREE.BoxGeometry(26, 0.2, 8), M(0x9a9287), g, 0, -0.1, 0);
  const roadTex = canvasTexture((ctx, w, h) => {
    ctx.fillStyle = '#a8a099'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#8a827a'; ctx.lineWidth = 2;
    for (let x = 0; x < w; x += 26) { ctx.strokeRect(x, 0, 24, h / 2); ctx.strokeRect(x + 13, h / 2, 24, h / 2); }
  }, 256, 128);
  roadTex.wrapS = roadTex.wrapT = THREE.RepeatWrapping; roadTex.repeat.set(6, 2);
  road.material = new THREE.MeshLambertMaterial({ map: roadTex });

  // colorful Goan (Fontainhas-style) houses both sides
  const colors = [0xf2c94c, 0x5a8fd0, 0xd96a4b, 0x76b388, 0xe8d9a0, 0xc05a7a];
  for (let i = -3; i <= 3; i++) {
    house(g, -9.5, -7.5 + i * 0.0, 4.2, 3.4 + (i % 2) * 0.6, 5, colors[(i + 3) % colors.length], 0).position.z = -7.2 - Math.abs(i) * 0.2;
    house(g, 9.5, 7.5 + i * 0.0, 4.2, 3.2 + ((i + 1) % 2) * 0.6, 5, colors[(i + 5) % colors.length], Math.PI).position.z = 7.2 + Math.abs(i) * 0.2;
  }

  // satire posters (parody, generic — no real slogans)
  const posters = [
    posterTexture('VOTE!', 'DI TEKAAAA PARTY'),
    posterTexture('SUSEGAD 4 ALL', 'ELECTED PROMISES*'),
    posterTexture('NEW ROAD SOON', '*SOON NOT DEFINED'),
    posterTexture('FREE WI-FI', 'COURTESY: NEXT GOVT'),
  ];
  let pi = 0;
  for (const x of [-6.5, -2.5, 2.5, 6.5]) {
    const side = pi % 2 ? 6.6 : -6.6;
    const t = posters[pi];
    const p = mesh(new THREE.BoxGeometry(1.3, 1.8, 0.05), new THREE.MeshLambertMaterial({ map: t }), g, x, 1.7, side);
    p.rotation.y = side > 0 ? Math.PI : 0;
    pi++;
  }

  // street lamps + power lines
  for (const x of [-8, 0, 8]) {
    const side = x === 0 ? 6.4 : (x < 0 ? -6.4 : 6.4);
    const pole = mesh(new THREE.CylinderGeometry(0.06, 0.08, 4.6, 6), M(0x4a4a4a), g, x, 2.3, side);
    const lamp = mesh(new THREE.SphereGeometry(0.14, 8, 8), M(0xfff2b0, { emissive: 0x998844 }), g, x, 4.5, side + (side > 0 ? -0.4 : 0.4));
    lamp.castShadow = false;
  }
  const wireMat = M(0x222222);
  for (const y of [4.3, 4.5]) {
    const wire = mesh(new THREE.BoxGeometry(20, 0.015, 0.015), wireMat, g, 0, y, -6.2);
    wire.castShadow = false;
  }

  // chapel tower far end
  const chapel = new THREE.Group(); chapel.position.set(0, 0, -13); g.add(chapel);
  mesh(new THREE.BoxGeometry(3.4, 5, 2.4), M(0xf5f2e8), chapel, 0, 2.5, 0);
  mesh(new THREE.BoxGeometry(1.2, 3.4, 1.2), M(0xf5f2e8), chapel, 0, 6.2, 0);
  mesh(new THREE.ConeGeometry(1.0, 1.6, 4), M(0x9e3b2b), chapel, 0, 8.4, 0);
  const cross = mesh(new THREE.BoxGeometry(0.5, 0.1, 0.08), M(0xd9cfa8), chapel, 0, 9.6, 0);
  mesh(new THREE.BoxGeometry(0.1, 0.62, 0.08), M(0xd9cfa8), chapel, 0, 9.4, 0);
  cross.castShadow = false;

  // banana plants + dustbins for flavour
  palm(g, -13.2, 5.4, 2.4);
  palm(g, 12.8, -5.4, 2.6);
  mesh(new THREE.CylinderGeometry(0.35, 0.3, 0.7, 8), M(0x2e6b46), g, -12.6, 0.35, 4.6);
  mesh(new THREE.CylinderGeometry(0.35, 0.3, 0.7, 8), M(0x3570b0), g, -12.1, 0.35, 5.0);

  // sky-ish backdrop of trees
  for (let i = 0; i < 8; i++) {
    mesh(new THREE.SphereGeometry(1.4 + Math.random(), 8, 8), M(0x3d7a45), g, (Math.random() - 0.5) * 30, 2.2, (Math.random() > 0.5 ? 1 : -1) * (12 + Math.random() * 4)).castShadow = false;
  }

  return {
    group: g,
    lights: () => {
      const hemi = new THREE.HemisphereLight(0xffe0b0, 0x5a5040, 0.9);
      const sun = new THREE.DirectionalLight(0xffd9a0, 1.15); sun.position.set(-8, 9, 6);
      sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
      sun.shadow.camera.left = -16; sun.shadow.camera.right = 16; sun.shadow.camera.top = 12; sun.shadow.camera.bottom = -12;
      return [hemi, sun];
    },
    update() {},
    bg: 0xf0c98c,
  };
}

// --- Arena 3: MIRAMAR ---------------------------------------------------------
function buildMiramar() {
  const g = new THREE.Group();
  const anim = [];

  // sand
  const sand = mesh(new THREE.CylinderGeometry(20, 20, 0.3, 32), M(0xe6d2a0), g, 0, -0.15, 0);
  sand.receiveShadow = true;

  // sea with animated waves (two planes)
  const seaMat = new THREE.MeshLambertMaterial({ color: 0x1f7fae, transparent: true, opacity: 0.94 });
  const sea = mesh(new THREE.BoxGeometry(60, 0.4, 22), seaMat, g, 0, 0.05, -24);
  sea.receiveShadow = false;
  const foam = mesh(new THREE.BoxGeometry(60, 0.18, 1.6), M(0xeaf6f8, { transparent: true, opacity: 0.8 }), g, 0, 0.12, -13.4);
  anim.push({ sea, foam, t: 0 });

  // sun + evening sky handled via bg color; add sun disc
  const sun = mesh(new THREE.SphereGeometry(1.4, 12, 12), M(0xffd27a, { emissive: 0xffaa33 }), g, -14, 5.5, -34);
  sun.castShadow = false;

  // palms
  palm(g, -7.5, -2.5, 4.0); palm(g, 7.8, -3.4, 3.4); palm(g, -11.5, 1.8, 3.0); palm(g, 12.2, 0.4, 4.4); palm(g, 4.5, -4.6, 2.8);

  // lifeguard tower
  const tower = new THREE.Group(); tower.position.set(10.5, 0, -6.5); g.add(tower);
  for (const [lx, lz] of [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]]) {
    mesh(new THREE.CylinderGeometry(0.07, 0.09, 3.0, 6), M(0x8a6d4a), tower, lx, 1.5, lz);
  }
  mesh(new THREE.BoxGeometry(2.2, 1.4, 2.2), M(0xd94f3d), tower, 0, 3.6, 0);
  const roofT = mesh(new THREE.ConeGeometry(1.8, 0.9, 4), M(0xf2e6c8), tower, 0, 4.9, 0);
  roofT.rotation.y = Math.PI / 4;

  // rocks + driftwood + shacks in distance
  for (let i = 0; i < 6; i++) {
    mesh(new THREE.DodecahedronGeometry(0.3 + Math.random() * 0.4, 0), M(0x8a8578), g, (Math.random() - 0.5) * 24, 0.15, -11.5 - Math.random() * 2);
  }
  for (let i = -2; i <= 2; i++) {
    house(g, i * 7.5, -20.5, 4.6, 2.2, 3, [0x2e6b46, 0x3570b0, 0xc05a7a][ (i + 2) % 3 ], 0);
  }
  // fishing boat
  const boat = new THREE.Group(); boat.position.set(-9.5, 0.12, -8.5); boat.rotation.y = 0.5; g.add(boat);
  mesh(new THREE.BoxGeometry(2.6, 0.5, 1.0), M(0x3a6ea5), boat, 0, 0.25, 0);
  mesh(new THREE.BoxGeometry(0.1, 1.6, 0.06), M(0x8a6d4a), boat, 0.8, 0.9, 0);
  anim.push({ boat });

  return {
    group: g,
    lights: () => {
      const hemi = new THREE.HemisphereLight(0xffd9b0, 0x4a5560, 0.95);
      const sunL = new THREE.DirectionalLight(0xffb060, 1.2); sunL.position.set(-10, 7, -6);
      sunL.castShadow = true; sunL.shadow.mapSize.set(1024, 1024);
      sunL.shadow.camera.left = -16; sunL.shadow.camera.right = 16; sunL.shadow.camera.top = 12; sunL.shadow.camera.bottom = -12;
      return [hemi, sunL];
    },
    update(dt, t) {
      const a = anim[0];
      a.sea.position.y = 0.05 + Math.sin(t * 1.1) * 0.1;
      a.sea.position.z = -24 + Math.sin(t * 0.7) * 0.8;
      a.foam.position.z = -13.4 + Math.sin(t * 1.1) * 1.4;
      a.foam.material.opacity = 0.5 + 0.4 * (0.5 + 0.5 * Math.sin(t * 1.1));
      if (a.boat) a.boat.position.y = 0.12 + Math.sin(t * 1.6) * 0.05;
    },
    bg: 0xf2a45c,
  };
}

const BUILDERS = { assembly: buildAssembly, path: buildPath, miramar: buildMiramar };

// ---------------------------------------------------------------------------
export class ArenaManager {
  constructor(scene) {
    this.scene = scene;
    this.current = null;
    this.stageId = null;
    this.glbEntries = [];
    this.loader = new GLTFLoader();
    this.backgroundPlane = null;
  }

  loadStage(id) {
    this.clearGLB();
    if (this.current) {
      this.scene.remove(this.current.group);
      const lights = this.currentLights || [];
      for (const l of lights) this.scene.remove(l);
    }
    this.stageId = id;
    this.current = BUILDERS[id]();
    this.scene.add(this.current.group);
    this.currentLights = this.current.lights();
    for (const l of this.currentLights) this.scene.add(l);
    this.scene.background = new THREE.Color(this.current.bg);
    this.scene.fog = new THREE.Fog(this.current.bg, 26, 60);
    return this.current;
  }

  clearGLB() {
    for (const e of this.glbEntries) this.scene.remove(e.root);
    this.glbEntries = [];
    if (this.backgroundPlane) { this.scene.remove(this.backgroundPlane); this.backgroundPlane = null; }
  }

  addGLB(name, url) {
    return new Promise((resolve, reject) => {
      this.loader.load(url, (gltf) => {
        const root = gltf.scene;
        root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
        const entry = { name, root, pos: [0, 0, 0], rot: [0, 0, 0], scale: 1 };
        this.scene.add(root);
        this.glbEntries.push(entry);
        resolve(entry);
      }, undefined, reject);
    });
  }

  applyEntryTransform(e) {
    e.root.position.set(...e.pos);
    e.root.rotation.set(THREE.MathUtils.degToRad(e.rot[0]), THREE.MathUtils.degToRad(e.rot[1]), THREE.MathUtils.degToRad(e.rot[2]));
    e.root.scale.setScalar(e.scale);
  }

  setBackground(url) {
    if (!url) { if (this.backgroundPlane) { this.scene.remove(this.backgroundPlane); this.backgroundPlane = null; } return; }
    const tex = new THREE.TextureLoader().load(url, () => {}, undefined, () => {});
    if (this.backgroundPlane) this.scene.remove(this.backgroundPlane);
    this.backgroundPlane = new THREE.Mesh(new THREE.PlaneGeometry(80, 45), new THREE.MeshBasicMaterial({ map: tex }));
    this.backgroundPlane.position.set(0, 12, -38);
    this.scene.add(this.backgroundPlane);
  }

  update(dt, t) { if (this.current) this.current.update(dt, t); }
}
