// enhanced/main.js — Enhanced Satire Edition entry: boots the shared engine + adds extras.
// Enhancements live only in this edition; the faithful edition (index.html) is untouched.

import { boot } from '../game.js';

const game = boot(document.getElementById('game'));
window.GAME_BEST_OF = window.GAME_BEST_OF || 3;

// --- BEST OF 3/5 toggle on the landing screen ---------------------------------
function addBestOfRow() {
  const diffChips = document.getElementById('ldDiffChips');
  if (!diffChips) return;
  const group = document.createElement('div');
  group.className = 'ld-group';
  group.innerHTML = '<span>MATCH</span>';
  const row = document.createElement('div');
  row.className = 'ld-row';
  row.innerHTML = `
    <button class="ld-chip bocard on" data-bo="3">BO3</button>
    <button class="ld-chip bocard" data-bo="5">BO5</button>`;
  group.appendChild(row);
  diffChips.parentElement.parentElement.insertBefore(group, diffChips.parentElement.nextSibling);
  row.querySelectorAll('.bocard').forEach(b => b.addEventListener('click', () => {
    window.GAME_BEST_OF = +b.dataset.bo;
    row.querySelectorAll('.bocard').forEach(x => x.classList.toggle('on', x === b));
    game.audio.menuMove();
    if (game.ui && game.ui.syncLanding) game.ui.syncLanding();
  }));
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addBestOfRow);
else addBestOfRow();

// --- taunt key visible in hint bar ---------------------------------------------
window.addEventListener('DOMContentLoaded', () => {
  const hint = document.getElementById('hint-bar');
  if (hint) hint.innerHTML += ' · press <b>T</b> to taunt';
});

// Taunt key (T) for P1 — routed through the input system
window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyT' && game.state === 'fight') game._tauntQueued = true;
});

export { game };
