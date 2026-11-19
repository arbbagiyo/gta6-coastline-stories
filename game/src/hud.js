import * as THREE from 'three';
import { WORLD, DISTRICTS, CHARACTERS, TUNE } from './config.js';
import { S } from './state.js';
import { clamp, formatClock, formatMoney } from './util.js';
import { input } from './input.js';
import { getPortrait } from './characters.js';
import { MISSION_TOTAL } from './missions.js';

const $ = (id) => document.getElementById(id);

export class HUD {
constructor(callbacks) {
this.cb = callbacks;
this.dialogueLines = null;
this.dialogueIdx = 0;
this.dialogueDone = null;
this.typeTimer = 0;
this.typeShown = 0;
this.toastTimer = 0;
this.bannerTimer = 0;
this.damageTimer = 0;
this.minimap = $('minimap');
this.mm = this.minimap.getContext('2d');
this.stars = 0;
}

init() {
$('btn-start').addEventListener('click', () => this.cb.onStart(false));
$('btn-continue').addEventListener('click', () => this.cb.onStart(true));
$('btn-resume').addEventListener('click', () => this.cb.onResume());
$('btn-restart').addEventListener('click', () => window.location.reload());
$('btn-sound').addEventListener('click', () => {
const muted = S.audio.toggleMute();
$('btn-sound').textContent = muted ? 'Sound: OFF' : 'Sound: ON';
});
$('btn-title-sound').addEventListener('click', () => {
const muted = S.audio ? S.audio.toggleMute() : false;
$('btn-title-sound').textContent = muted ? 'Sound: OFF' : 'Sound: ON';
});
$('screen-start').classList.remove('hidden');
const cast = $('cast-row');
if (cast) cast.innerHTML = ['lena', 'theo', 'rosa', 'ana', 'vince', 'marco'].map((w) => `<figure><img src="${getPortrait(w)}" alt=""><figcaption>${CHARACTERS[w].name.replace('Det. ', '').split(' ')[0]}</figcaption></figure>`).join('');
for (const b of document.querySelectorAll('#weapon-wheel [data-w]')) {
b.addEventListener('click', () => {
S.weapon = b.dataset.w;
S.audio?.click();
});
}
}

showWheel(open) {
$('weapon-wheel').classList.toggle('hidden', !open);
if (open) {
for (const b of document.querySelectorAll('#weapon-wheel [data-w]')) b.classList.toggle('sel', b.dataset.w === S.weapon);
}
}

showScreen(name) {
for (const id of ['screen-start', 'screen-pause', 'screen-wasted', 'screen-busted']) {
$(id).classList.toggle('hidden', id !== `screen-${name}`);
}
if (name === null || name === 'none') {
for (const id of ['screen-start', 'screen-pause', 'screen-wasted', 'screen-busted']) $(id).classList.add('hidden');
}
$('hud').classList.toggle('hidden', name === 'start');
}

setSaveInfo(hasSave, info) {
$('btn-continue').classList.toggle('hidden', !hasSave);
if (hasSave && info) {
$('save-info').textContent = `Save found — mission ${info.missionIndex + 1}/${MISSION_TOTAL}, ${formatMoney(info.cash)}, ${info.shellsFound}/10 shells`;
}
}


setObjective(text) {
const el = $('objective');
if (el.textContent !== text) el.textContent = text;
el.classList.toggle('hidden', !text);
}

setPrompt(text) {
const el = $('prompt');
if (el.textContent !== text) el.textContent = text;
el.classList.toggle('hidden', !text);
}

toast(text) {
const el = $('toast');
el.textContent = text;
el.classList.remove('hidden');
this.toastTimer = 3.2;
}

showBanner(title, sub) {
$('banner-title').textContent = title;
$('banner-sub').textContent = sub || '';
$('banner').classList.remove('hidden');
this.bannerTimer = 3.4;
}

showStars(n) {
this.stars = n;
const el = $('stars');
el.textContent = '★'.repeat(n) + '☆'.repeat(5 - n);
el.classList.toggle('hot', n > 0);
}

showBust(frac) {
const el = $('bust-wrap');
if (frac <= 0) { el.classList.add('hidden'); return; }
el.classList.remove('hidden');
$('bust-fill').style.width = `${clamp(frac * 100, 0, 100)}%`;
}

showSpotted(frac) {
const el = $('spotted-wrap');
if (frac <= 0.02) { el.classList.add('hidden'); return; }
el.classList.remove('hidden');
$('spotted-fill').style.width = `${clamp(frac * 100, 0, 100)}%`;
}

flashDamage() {
this.damageTimer = 0.5;
$('damage-flash').classList.remove('hidden');
}

setRadio(text) {
$('radio-label').textContent = text;
}


showDialogue(lines, onDone) {
this.dialogueLines = lines;
this.dialogueIdx = 0;
this.dialogueDone = onDone;
this.dialogueGuard = 0.35;
S.dialogue = true;
this.showSpotted(0);
this.showBust(0);
$('dialogue').classList.remove('hidden');
this.renderDialogueLine();
}

renderDialogueLine() {
const line = this.dialogueLines[this.dialogueIdx];
const ch = CHARACTERS[line.who] || CHARACTERS.lena;
$('dlg-name').textContent = ch.name;
$('dlg-name').style.color = ch.color;
const av = $('dlg-avatar');
av.textContent = '';
av.style.background = `url(${getPortrait(line.who)}) center/cover`;
$('dlg-text').textContent = '';
this.typeShown = 0;
this.typeTimer = 0;
this.fullText = line.text;
}

advanceDialogue() {
if (!this.dialogueLines) return;
if (this.typeShown < this.fullText.length) {
this.typeShown = this.fullText.length;
$('dlg-text').textContent = this.fullText;
return;
}
this.dialogueIdx += 1;
if (this.dialogueIdx >= this.dialogueLines.length) {
this.dialogueLines = null;
S.dialogue = false;
$('dialogue').classList.add('hidden');
const done = this.dialogueDone;
this.dialogueDone = null;
done?.();
} else {
this.renderDialogueLine();
}
}


drawMinimap() {
const ctx = this.mm;
const W = 180, H = 180;
const scale = W / 200;
const px = S.player.pos.x, pz = S.player.pos.z;
ctx.clearRect(0, 0, W, H);
ctx.save();
ctx.beginPath();
ctx.arc(W / 2, H / 2, W / 2 - 2, 0, Math.PI * 2);
ctx.clip();
ctx.fillStyle = '#2d3a2f';
ctx.fillRect(0, 0, W, H);
const toMap = (x, z) => [W / 2 + (x - px) * scale, H / 2 + (z - pz) * scale];

ctx.fillStyle = '#2a6a8a';
const [ox] = toMap(WORLD.oceanEdge, 0);
ctx.fillRect(0, 0, Math.max(0, ox), H);
ctx.fillStyle = '#d8c890';
const [bx] = toMap(WORLD.beachEdge, 0);
ctx.fillRect(Math.max(0, ox), 0, Math.max(0, bx - ox), H);

ctx.strokeStyle = '#555a60';
ctx.lineWidth = WORLD.roadWidth * scale;
for (const r of WORLD.roads) {
const [x1, y1] = toMap(r, -240);
const [x2, y2] = toMap(r, 240);
ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
const [x3, y3] = toMap(-240, r);
const [x4, y4] = toMap(240, r);
ctx.beginPath(); ctx.moveTo(x3, y3); ctx.lineTo(x4, y4); ctx.stroke();
}

ctx.fillStyle = 'rgba(70, 80, 70, 0.5)';
for (let i = 0; i < DISTRICTS.length; i += 1) {
const d = DISTRICTS[i];
const [x1, y1] = toMap(d.x0, d.z0);
const [x2, y2] = toMap(d.x1, d.z1);
ctx.fillStyle = `#${d.color.toString(16).padStart(6, '0')}55`;
ctx.fillRect(x1, y1, x2 - x1, y2 - y1);
}

if (S.marker) {
const [mx, my] = toMap(S.marker.x, S.marker.z);
ctx.fillStyle = '#ffc94d';
ctx.beginPath(); ctx.arc(mx, my, 6, 0, Math.PI * 2); ctx.fill();
ctx.strokeStyle = '#fff';
ctx.lineWidth = 1.5;
ctx.stroke();
}

for (const unit of S.police) {
const [bx2, by2] = toMap(unit.car.pos.x, unit.car.pos.z);
ctx.fillStyle = '#4d8aff';
ctx.beginPath(); ctx.arc(bx2, by2, 3.5, 0, Math.PI * 2); ctx.fill();
}

for (const rb of S.roadblocks || []) {
for (const car of rb.cars) {
const [rx2, ry2] = toMap(car.pos.x, car.pos.z);
ctx.fillStyle = '#ff5a3c';
ctx.beginPath(); ctx.arc(rx2, ry2, 3.5, 0, Math.PI * 2); ctx.fill();
}
}

ctx.translate(W / 2, H / 2);
ctx.rotate(-S.player.heading + Math.PI / 2);
ctx.fillStyle = '#fff';
ctx.beginPath();
ctx.moveTo(0, -8);
ctx.lineTo(5, 6);
ctx.lineTo(-5, 6);
ctx.closePath();
ctx.fill();
ctx.strokeStyle = '#222';
ctx.lineWidth = 1;
ctx.stroke();
ctx.restore();

ctx.strokeStyle = 'rgba(255,255,255,0.35)';
ctx.lineWidth = 2;
ctx.beginPath();
ctx.arc(W / 2, H / 2, W / 2 - 2, 0, Math.PI * 2);
ctx.stroke();
}


update(dt) {

if (this.dialogueLines) {
this.dialogueGuard = Math.max(0, (this.dialogueGuard || 0) - dt);
this.typeTimer += dt;
const want = Math.floor(this.typeTimer * 45);
if (want > this.typeShown && this.typeShown < this.fullText.length) {
this.typeShown = Math.min(want, this.fullText.length);
$('dlg-text').textContent = this.fullText.slice(0, this.typeShown);
}
if (this.dialogueGuard <= 0 && (input.pressed.has('KeyE') || input.mouseClicked)) this.advanceDialogue();
}
if (this.toastTimer > 0) {
this.toastTimer -= dt;
if (this.toastTimer <= 0) $('toast').classList.add('hidden');
}
if (this.bannerTimer > 0) {
this.bannerTimer -= dt;
if (this.bannerTimer <= 0) $('banner').classList.add('hidden');
}
if (this.damageTimer > 0) {
this.damageTimer -= dt;
$('damage-flash').style.opacity = clamp(this.damageTimer * 2, 0, 0.7);
if (this.damageTimer <= 0) $('damage-flash').classList.add('hidden');
}
if (S.screen !== 'play') return;

this.showWheel(input.keys.has('Tab') && !S.dialogue);

$('health-fill').style.width = `${clamp(S.health, 0, 100)}%`;
$('armor-fill').style.width = `${clamp(S.armor, 0, 100)}%`;
$('respect-fill').style.width = `${clamp(S.respect, 0, 100)}%`;
$('respect-label').textContent = `RESPECT ${S.respect}`;
$('cash-label').textContent = formatMoney(S.cash);
$('clock-label').textContent = formatClock(S.dayTime);
const district = S.districtAt ? S.districtAt(S.player.pos.x, S.player.pos.z) : null;
$('district-label').textContent = district ? district.name : 'Solmarina';
$('ammo-label').textContent = S.weapon === 'pistol' ? `🔫 ${S.ammo} / ${TUNE.magSize}` : S.weapon === 'smg' ? `🔫 ${S.smgAmmo} / 30` : S.weapon === 'rpg' ? `🚀 ${S.player ? S.player.rockets : 0}` : '—';
if (S.driving) {
const kmh = Math.round(Math.abs(S.driving.speed) * 3.6);
$('speed-label').textContent = `${kmh} km/h`;
$('speed-wrap').classList.remove('hidden');
$('radio-wrap').classList.remove('hidden');
} else {
$('speed-wrap').classList.add('hidden');
$('radio-wrap').classList.add('hidden');
}

const arrow = $('offscreen-arrow');
if (S.marker) {
const dx = S.marker.x - S.player.pos.x, dz = S.marker.z - S.player.pos.z;
const dist = Math.hypot(dx, dz);
const toMarker = Math.atan2(-dz, dx);
const camYaw = Math.atan2(-S.camera.getWorldDirection(new THREE.Vector3()).z, S.camera.getWorldDirection(new THREE.Vector3()).x);
let rel = toMarker - camYaw;
while (rel > Math.PI) rel -= Math.PI * 2;
while (rel < -Math.PI) rel += Math.PI * 2;
if (Math.abs(rel) > 0.7 && dist > 15) {
arrow.classList.remove('hidden');
arrow.style.transform = `translateX(-50%) rotate(${rel > 0 ? -35 : 35}deg)`;
arrow.textContent = rel > 0 ? '◀' : '▶';
} else {
arrow.classList.add('hidden');
}
} else {
arrow.classList.add('hidden');
}
const mp = $('mission-panel');
const m = S.mission;
if (m) {
const st = m.def.steps[Math.min(m.stepIdx, m.def.steps.length - 1)] || {};
$('mp-title').textContent = `JOB ${S.missionIndex + 1}/${MISSION_TOTAL} — ${m.def.title}`;
$('mp-stage').textContent = m.def.steps.length ? `Stage ${m.stepIdx + 1}/${m.def.steps.length}` : 'Combat';
$('mp-next').textContent = st.label || 'Talk it through';
} else if (S.missionIndex >= MISSION_TOTAL) {
$('mp-title').textContent = 'FREE ROAM';
$('mp-stage').textContent = 'All jobs complete';
$('mp-next').textContent = 'Courier jobs · shells on the beach';
} else {
$('mp-title').textContent = 'NEXT JOB';
$('mp-stage').textContent = `Job ${S.missionIndex + 1}/${MISSION_TOTAL} awaits`;
$('mp-next').textContent = 'Follow the green beacon';
}
mp.classList.remove('hidden');
const pp = $('police-panel');
const ds = (x, z) => Math.round(Math.hypot(x - S.player.pos.x, z - S.player.pos.z));
if (S.wanted > 0 && (S.police.length || S.heli || (S.roadblocks && S.roadblocks.length))) {
const rows = S.police.slice(0, 4).map((u, i) => `UNIT ${i + 1} · ${ds(u.car.pos.x, u.car.pos.z)}m · ${u.hiddenTimer > 0 ? 'SEARCHING' : 'PURSUIT'}`);
if (S.heli) rows.push(`HELI · ${ds(S.heli.pos.x, S.heli.pos.z)}m · AIRBORNE`);
for (const rb of S.roadblocks || []) rows.push(`ROADBLOCK · ${ds(rb.x, rb.z)}m · SEALED ROAD`);
$('pp-list').innerHTML = rows.join('<br>');
pp.classList.remove('hidden');
} else pp.classList.add('hidden');
$('slot-fists').classList.toggle('sel', S.weapon === 'fists');
$('slot-pistol').classList.toggle('sel', S.weapon === 'pistol');
$('slot-smg').classList.toggle('sel', S.weapon === 'smg');
$('slot-rpg').classList.toggle('sel', S.weapon === 'rpg');
$('slot-ammo').textContent = `${S.ammo}/${TUNE.magSize}`;
$('slot-smg-ammo').textContent = `${S.smgAmmo}/30`;
$('slot-rockets').textContent = `${S.player ? S.player.rockets : 0}`;
this.drawMinimap();

$('crosshair').classList.toggle('hidden', !(S.player.aiming && !S.driving));
}
}
