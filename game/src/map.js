import { WORLD, DISTRICTS, PLACES } from './config.js';
import { S } from './state.js';
import { jobStatuses } from './missions.js';
import { formatMoney, roadWave } from './util.js';

let open = false, timer = 0;
export const isMapOpen = () => open;
export function toggleMap() {
open = !open;
document.getElementById('map-screen').classList.toggle('hidden', !open);
if (open) { document.exitPointerLock?.(); drawMap(); fillSide(); }
}
export function closeMap() {
if (!open) return;
open = false;
document.getElementById('map-screen').classList.add('hidden');
}
export function updateMap(dt) {
if (!open) return;
timer += dt;
if (timer > 0.4) { timer = 0; drawMap(); }
}
function drawMap() {
const c = document.getElementById('map-canvas'), g = c.getContext('2d');
const W = 480, X = (x) => x + 240, Y = (z) => z + 240;
g.fillStyle = '#223528'; g.fillRect(0, 0, W, W);
for (const d of DISTRICTS) {
g.fillStyle = d.map; g.globalAlpha = 0.85;
g.fillRect(X(d.x0), Y(d.z0), d.x1 - d.x0, d.z1 - d.z0);
}
g.globalAlpha = 1;
g.fillStyle = '#2a6a8a'; g.fillRect(0, 0, X(WORLD.oceanEdge), W);
g.fillStyle = '#d8c890'; g.fillRect(X(WORLD.oceanEdge), 0, X(WORLD.beachEdge) - X(WORLD.oceanEdge), W);
g.strokeStyle = '#555a60'; g.lineWidth = 3;
for (const r of WORLD.roads) {
g.beginPath();
for (let s = -240; s <= 240; s += 12) { const x = X(r + roadWave(s)), y = Y(s); if (s === -240) g.moveTo(x, y); else g.lineTo(x, y); }
g.stroke();
g.beginPath();
for (let s = -240; s <= 240; s += 12) { const x = X(s), y = Y(r + roadWave(s)); if (s === -240) g.moveTo(x, y); else g.lineTo(x, y); }
g.stroke();
}
g.fillStyle = 'rgba(255,255,255,0.9)'; g.font = '11px sans-serif';
for (const d of DISTRICTS) g.fillText(d.name, X(d.x0) + 6, Y(d.z0) + 16);
const dot = (x, z, col, r) => {
g.fillStyle = col; g.beginPath(); g.arc(X(x), Y(z), r, 0, 7); g.fill();
g.strokeStyle = '#fff'; g.lineWidth = 1; g.stroke();
};
dot(PLACES.safehouse.x, PLACES.safehouse.z, '#8fe89a', 6);
dot(PLACES.policeStation.x, PLACES.policeStation.z, '#4d8aff', 5);
dot(PLACES.hospital.x, PLACES.hospital.z, '#ff6a6a', 5);
dot(PLACES.theoGarage.x, PLACES.theoGarage.z, '#ffc94d', 5);
dot(PLACES.courierDepot.x, PLACES.courierDepot.z, '#f2b04e', 5);
dot(PLACES.marinaDock.x, PLACES.marinaDock.z, '#7fd4c1', 5);
for (const s of S.shells) if (!s.taken) dot(s.x, s.z, '#ff9ad5', 3);
if (S.marker) dot(S.marker.x, S.marker.z, '#ffc94d', 8);
g.save();
g.translate(X(S.player.pos.x), Y(S.player.pos.z));
g.rotate(-S.player.heading + Math.PI / 2);
g.fillStyle = '#fff'; g.beginPath();
g.moveTo(0, -9); g.lineTo(6, 7); g.lineTo(-6, 7); g.closePath(); g.fill();
g.strokeStyle = '#222'; g.stroke();
g.restore();
}
function fillSide() {
document.getElementById('map-jobs').innerHTML = jobStatuses().map((j) => `<div class="mj ${j.status}">${j.status === 'done' ? '✓' : j.status === 'active' ? '▶' : '🔒'} ${j.title}</div>`).join('') + `<div class="mj">✦ Courier runs: ${S.stats.couriersDone} · Shells: ${S.shellsFound}/10</div>`;
document.getElementById('map-stats').textContent = `Cash ${formatMoney(S.cash)} · Respect ${S.stats.missionsDone * 20 + S.stats.couriersDone * 5} · Cars stolen ${S.stats.carsStolen} · Rivals down ${S.stats.rivalsDown} · Max wanted ${S.stats.maxWanted}★`;
}
