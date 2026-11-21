// config.js — shared tunables, roster, stage registry (both editions)

export const EDITION = (typeof window !== 'undefined' && window.GAME_EDITION) || 'faithful';

export const VERSION = 'v1.0.0-recon' + (EDITION === 'enhanced' ? ' +enhanced' : '');

export const VIEW_DEFAULTS = {
  height: 2.3, distance: 6.2, widthMargin: 3.2,
  lookHeight: 1.15, sideFollow: 0.55, fov: 42,
};

export const SPAWN_DEFAULTS = {
  p1: [-2.6, 0, 0],
  ai: [2.6, 0, 0],
};

export const STAGES = [
  { id: 'assembly', label: 'ASSEMBLY', name: 'Arena 1', ground: 0, ambience: 'crowd' },
  { id: 'path',     label: 'PEOPLES PATH', name: 'Arena 2', ground: 0, ambience: 'street' },
  { id: 'miramar',  label: 'MIRAMAR', name: 'Arena 3', ground: 0, ambience: 'waves' },
];

export const ROSTER = [
  {
    id: 'kaka',
    name: 'PRAMOD KAKA',
    tagline: 'The Stable Government',
    parodyOf: 'A Goa Chief Minister caricature (parody persona)',
    color: '#c2410c',
    portrait: null, // rendered procedurally on select screen
    stats: { health: 100, walk: 2.6, walkBack: 2.1, jump: 8.2, scale: 1.0 },
    moves: {
      punch:  { dmg: 6,  startup: .10, active: .08, recovery: .14, range: 1.55, meter: 8,  meterTake: 12, height: 'high' },
      kick:   { dmg: 10, startup: .14, active: .10, recovery: .20, range: 1.95, meter: 10, meterTake: 14, height: 'mid'  },
      heavy:  { dmg: 18, startup: .26, active: .12, recovery: .34, range: 2.10, meter: 14, meterTake: 18, height: 'mid', kb: 2.2 },
      grab:   { dmg: 12, startup: .16, active: .10, recovery: .30, range: 1.35, meter: 12, meterTake: 16, height: 'mid', kb: 1.8, unblockable: true },
      special:{ dmg: 28, startup: .22, active: .45, recovery: .40, range: 2.40, meter: 0,  meterTake: 26, height: 'mid', kb: 3.2, motion: 'charge', name: 'DOUBLE ENGINE CHARGE' },
    },
    ai: { reaction: .40, aggression: .5, blockSkill: .55, spacing: 'mid', specialAt: 3.2 },
  },
  {
    id: 'por',
    name: 'RANYALO POR',
    tagline: 'The Brawler Lad',
    parodyOf: 'Original community persona (creative interpretation)',
    color: '#b91c1c',
    stats: { health: 92, walk: 3.1, walkBack: 2.5, jump: 8.6, scale: 0.95 },
    moves: {
      punch:  { dmg: 5,  startup: .08, active: .07, recovery: .12, range: 1.45, meter: 7,  meterTake: 11, height: 'high' },
      kick:   { dmg: 9,  startup: .13, active: .09, recovery: .19, range: 1.85, meter: 9,  meterTake: 13, height: 'mid'  },
      heavy:  { dmg: 16, startup: .24, active: .11, recovery: .32, range: 2.00, meter: 13, meterTake: 17, height: 'mid', kb: 2.0 },
      grab:   { dmg: 11, startup: .15, active: .09, recovery: .28, range: 1.30, meter: 11, meterTake: 15, height: 'mid', kb: 1.6, unblockable: true },
      special:{ dmg: 26, startup: .20, active: .50, recovery: .42, range: 2.30, meter: 0,  meterTake: 24, height: 'high', kb: 2.8, motion: 'spin', name: 'RANN-FURY SPIN' },
    },
    ai: { reaction: .30, aggression: .68, blockSkill: .40, spacing: 'close', specialAt: 2.0 },
  },
];

export const DIFFICULTY = {
  easy:   { interval: [.55, .90], reaction: .15, aggression: .35, antiAir: 0,   specialUse: .25, blockBias: .15, whiffPunish: 0 },
  normal: { interval: [.30, .55], reaction: .40, aggression: .55, antiAir: .25, specialUse: .60, blockBias: .40, whiffPunish: .3 },
  hard:   { interval: [.14, .30], reaction: .72, aggression: .75, antiAir: .55, specialUse: .90, blockBias: .72, whiffPunish: .7 },
};

export const ROUND_TIME = 60;
export const ROUNDS_TO_WIN = 2;          // best of 3
export const STAGE_MIN_X = -9.6;
export const STAGE_MAX_X = 9.6;

export const KEYMAP_P1 = {
  left: ['KeyA'], right: ['KeyD'], up: ['KeyW'], down: ['KeyS'],
  punch: ['KeyQ', 'KeyZ'], kick: ['KeyE', 'KeyC'], heavy: ['KeyX'], special: ['KeyR'],
};
export const KEYMAP_P2 = {
  left: ['ArrowLeft'], right: ['ArrowRight'], up: ['ArrowUp'], down: ['ArrowDown'],
  punch: ['Comma', 'KeyU'], kick: ['Period', 'KeyI'], heavy: ['Slash', 'KeyO'], special: ['KeyP', 'ShiftRight'],
};
