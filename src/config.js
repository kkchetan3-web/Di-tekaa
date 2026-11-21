// config.js — shared tunables, roster, stage registry (both editions)
//
// FIDELITY NOTE (docs/06 §5): attack/physics/meter/AI numbers below are the
// VERIFIED original v0.3.1 values, transcribed from the recovered bundle as
// observed data and re-implemented here. Deviations for our build are marked.
// The original ships ONE AI (difficulty chips inert, EASY/HARD locked) — our
// EASY/HARD profiles are documented extrapolations so the observed UI can
// actually be used (requirement), flagged in docs/04.

export const EDITION = (typeof window !== 'undefined' && window.GAME_EDITION) || 'faithful';

export const VERSION = 'v1.0.0-recon' + (EDITION === 'enhanced' ? ' +enhanced' : '');

// Verified: view defaults {y 2.3, minZ 6.2, margin 3.2, lookY 1.15, follow .55, fov 42}
export const VIEW_DEFAULTS = {
  height: 2.3, distance: 6.2, widthMargin: 3.2,
  lookHeight: 1.15, sideFollow: 0.55, fov: 42,
};

// Verified spawns ±2.6
export const SPAWN_DEFAULTS = {
  p1: [-2.6, 0, 0],
  ai: [2.6, 0, 0],
};

export const STAGES = [
  { id: 'assembly', label: 'ASSEMBLY', name: 'Arena 1', file: 'courtyard', ground: 0, ambience: 'crowd' },
  { id: 'path',     label: 'PEOPLES PATH', name: 'Arena 2', file: 'peoplespath', ground: 0, ambience: 'street' },
  { id: 'miramar',  label: 'MIRAMAR', name: 'Arena 3', file: 'miramar', ground: 0, ambience: 'waves' },
];

// Verified: both fighters share ONE base attack set; specials differ.
// Base special frame data {startup .22, active .28, recovery .5, range 1.9, meterCost 100}.
// Meter: attacker +7.2 clean / +3.6 blocked; victim +4.8 / +1.8 (flat, not per-move).
const MOVES = () => ({
  punch:    { dmg: 4,  startup: .035, active: .10,  recovery: .075, range: 1.40, height: 'mid',  kb: 2.0, meter: 7.2, meterTake: 4.8, whiff: .06 },
  cross:    { dmg: 5,  startup: .10,  active: .14,  recovery: .10,  range: 1.45, height: 'mid',  kb: 2.0, meter: 7.2, meterTake: 4.8, whiff: 0   },
  hook:     { dmg: 6,  startup: .15,  active: .225, recovery: .16,  range: 1.45, height: 'mid',  kb: 2.0, meter: 7.2, meterTake: 4.8, whiff: 0   },
  kick:     { dmg: 7,  startup: .12,  active: .26,  recovery: .26,  range: 1.65, height: 'high', kb: 2.2, meter: 7.2, meterTake: 4.8, whiff: .12, knockdown: 'hard' },
  heavy:    { dmg: 10, startup: .14,  active: .18,  recovery: .40,  range: 1.50, height: 'mid',  kb: 2.4, meter: 7.2, meterTake: 4.8, whiff: .16, knockdown: 'hard' },
  grab:     { dmg: 10, startup: .14,  active: .18,  recovery: .40,  range: 1.50, height: 'mid',  kb: 2.4, meter: 7.2, meterTake: 4.8, whiff: .16, knockdown: 'hard', grab: true },
  sweep:    { dmg: 7,  startup: .30,  active: .18,  recovery: .35,  range: 1.70, height: 'low',  kb: 2.2, meter: 7.2, meterTake: 4.8, whiff: .14, knockdown: 'soft', crouch: true },
  groin:    { dmg: 6,  startup: .12,  active: .26,  recovery: .30,  range: 1.45, height: 'low',  kb: 2.0, meter: 7.2, meterTake: 4.8, whiff: 0,   knockdown: 'soft', crouch: true },
  uppercut: { dmg: 8,  startup: .20,  active: .12,  recovery: .40,  range: 1.40, height: 'mid',  kb: 2.2, meter: 7.2, meterTake: 4.8, whiff: .16, knockdown: 'hard', launch: 5.5, crouch: true },
});

export const ROSTER = [
  {
    id: 'kaka',
    name: 'PRAMOD KAKA',
    tagline: 'The Stable Government',
    parodyOf: 'A Goa Chief Minister caricature (parody persona)',
    color: '#c2410c',
    portrait: null, // rendered procedurally on select screen
    stats: { health: 100, walk: 3.2, walkBack: 3.2, jump: 6.2, scale: 1.0 },
    moves: {
      ...MOVES(),
      special: {
        dmg: 20, startup: .22, active: .28, recovery: .5, range: 1.9, height: 'mid',
        kb: 3.0, meter: 0, meterTake: 4.8, motion: 'charge', // presentation approximates the verified levitate+beam cast (docs/04)
        name: 'BHIVPACHI GARAZ NA!', castAt: .5, castTime: 6.8, travel: .18,
        launch: 3.5, throwX: 6, voice: 'kaka_special',
      },
    },
    ai: { reaction: .40, aggression: .5, blockSkill: .55, spacing: 'mid', specialAt: 3.2 },
  },
  {
    id: 'por',
    name: 'RANYALO POR',
    tagline: 'The Brawler Lad',
    parodyOf: 'Original community persona (creative interpretation)',
    color: '#b91c1c',
    stats: { health: 100, walk: 3.2, walkBack: 3.2, jump: 6.2, scale: 0.95 },
    moves: {
      ...MOVES(),
      special: {
        dmg: 20, startup: .22, active: .28, recovery: .5, range: 1.9, height: 'mid',
        kb: 3.0, meter: 0, meterTake: 4.8, motion: 'spin', // presentation approximates the verified ambulance run (docs/04)
        name: '108 : SUSPENSION ORDER', castAt: .9, castTime: 7.4, travel: .6,
        drift: 2, launch: 4, throwX: 9, voice: 'por_special',
      },
    },
    ai: { reaction: .30, aggression: .68, blockSkill: .40, spacing: 'close', specialAt: 2.0 },
  },
];

// Verified AI (normal) = single original behavior; EASY/HARD are our
// documented extrapolations so the observed three-chip UI stays usable.
export const DIFFICULTY = {
  easy:   { attackDist: 1.45, interval: [.85, 1.65], weights: [.7, .22, .08], blockReact: .03, blockRange: 1.8, blockHold: .28, specialHold: [2.0, 4.5], walkDist: 1.2 },
  normal: { attackDist: 1.45, interval: [.55, 1.10], weights: [.55, .30, .15], blockReact: .06, blockRange: 1.8, blockHold: .28, specialHold: [1.2, 3.4], walkDist: 1.0 },
  hard:   { attackDist: 1.60, interval: [.34, .70],  weights: [.45, .35, .20], blockReact: .10, blockRange: 2.0, blockHold: .34, specialHold: [.6, 1.8],  walkDist: .9 },
};

export const ROUND_TIME = 60;
export const ROUNDS_TO_WIN = 2;          // verified: wins >= 2 -> GAME OVER (best of 3)
export const STAGE_MIN_X = -6.5;         // verified arena halfWidth 6.5
export const STAGE_MAX_X = 6.5;

// P1 keymap verified exactly: A/D/W/S + arrows as alternates, punch Q|Z, kick E|C, heavy X, special R.
export const KEYMAP_P1 = {
  left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'],
  up: ['KeyW', 'ArrowUp'], down: ['KeyS', 'ArrowDown'],
  punch: ['KeyQ', 'KeyZ'], kick: ['KeyE', 'KeyC'], heavy: ['KeyX'], special: ['KeyR'],
};
// Our addition (original 2P never went live; documented in docs/06 §5.11).
export const KEYMAP_P2 = {
  left: ['Comma'], right: ['Period'], up: ['Slash'], down: ['ShiftRight'],
  punch: ['KeyU', 'KeyO'], kick: ['KeyI', 'KeyL'], heavy: ['KeyK'], special: ['KeyP'],
};
