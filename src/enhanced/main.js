// enhanced/main.js — Enhanced Satire Edition entry: boots the shared engine + adds extras.
// Enhancements live only in this edition; the faithful edition (index.html) is untouched.

import { boot } from '../game.js';

const game = boot(document.getElementById('game'));
window.GAME_BEST_OF = window.GAME_BEST_OF || 3;

// --- BEST OF 3/5 toggle on the select screen ---------------------------------
function addBestOfRow() {
  const diffRow = document.getElementById('diff-row');
  if (!diffRow) return;
  const label = document.createElement('div');
  label.className = 'row-label';
  label.textContent = 'MATCH LENGTH';
  const row = document.createElement('div');
  row.id = 'bestof-row';
  row.style.cssText = 'display:flex;gap:8px';
  row.innerHTML = `
    <button class="dcard bocard picked" data-bo="3">BEST OF 3</button>
    <button class="dcard bocard" data-bo="5">BEST OF 5</button>`;
  diffRow.parentElement.insertBefore(label, diffRow.nextSibling);
  diffRow.parentElement.insertBefore(row, label.nextSibling);
  row.querySelectorAll('.bocard').forEach(b => b.addEventListener('click', () => {
    window.GAME_BEST_OF = +b.dataset.bo;
    row.querySelectorAll('.bocard').forEach(x => x.classList.toggle('picked', x === b));
    game.audio.menuMove();
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
