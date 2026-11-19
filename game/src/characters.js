import * as THREE from 'three';
import { WORLD, TUNE, CHARACTERS } from './config.js';
import { S, addRespect } from './state.js';
import { makeRng, clamp, damp, circleVsBox, dist2D } from './util.js';

const SKIN = [0xf2d3b3, 0xe8c39a, 0xd9a878, 0xc98d5e, 0xa0663f, 0x8a5a3a, 0x6e4526];
const SHIRTS = [0xc23b2e, 0x2e6bc2, 0x3aa84e, 0xe8c832, 0xe86a8a, 0x6a4a9e, 0x2ea8a0, 0xe8e8e8, 0xd97a2e, 0x4a8a6a];
const PANTS = [0x2a3a5a, 0x3a3a3a, 0x5a4a3a, 0x223322, 0x4a4a5a, 0x6a6a7a];
const HAIRC = [0x1a1210, 0x2a2018, 0x4a3018, 0x6a4a22, 0xb08a3e, 0x8a8a8a, 0xc23b2e, 0x3a3a3a];
const EYES = ['#3a2a1a', '#2a1c10', '#4a3220', '#3a4a5a', '#2a4a2a', '#5a4a2a'];

export const LOOKS = {
lena: { skin: 0xe8c39a, eye: '#4a3220', brow: 1, mouth: 1, lip: 1, hair: 'mohawk', hairC: 0xff4da6, female: 1, shirt: 0xf2f2f2, pants: 0x2e5ac8, tank: 1 },
theo: { skin: 0x6e4526, eye: '#2a1c10', brow: 2, mouth: 1, beard: 2, hair: 'short', hairC: 0x14100c, shirt: 0x8a6a2a, pants: 0x3a3a3a },
rosa: { skin: 0xd9a878, eye: '#3a2415', brow: 1, mouth: 1, lip: 1, hair: 'long', hairC: 0x201510, female: 1, shirt: 0xc23b5e, pants: 0x2a2a3a },
vince: { skin: 0xf0d0b0, eye: '#5a6a7a', brow: 2, mouth: 0, beard: 1, hair: 'slick', hairC: 0x777770, shirt: 0x3a3a4a, pants: 0x222226 },
ana: { skin: 0xf2d3b3, eye: '#2a2018', brow: 0, mouth: 0, hair: 'bob', hairC: 0x1a1a1a, female: 1, shirt: 0x2a4a7a, pants: 0x1a2530 },
marco: { skin: 0xc98d5e, eye: '#3a2a1a', brow: 2, mouth: 0, beard: 1, hair: 'buzz', hairC: 0x2a2018, shirt: 0x8a2e2e, pants: 0x2a2a2e },
};

const css = (c) => '#' + c.toString(16).padStart(6, '0');
const shade = (c, f) => (((((c >> 16) & 255) * f) | 0) << 16) | (((((c >> 8) & 255) * f) | 0) << 8) | (((c & 255) * f) | 0);

function drawFace(g, f, s) {
g.save();
g.scale(s, s);
const skin = css(f.skin), hair = css(f.hairC);
const el = (x, y, rx, ry) => { g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 7); g.fill(); };
const ar = (x, y, r) => { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); };
const ln = (a, b, c, d) => { g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); g.stroke(); };
g.fillStyle = skin;
g.fillRect(0, 0, 128, 128);
const vg = g.createLinearGradient(0, 0, 0, 128);
vg.addColorStop(0, 'rgba(255,255,255,0.13)'); vg.addColorStop(0.55, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.15)');
g.fillStyle = vg;
g.fillRect(0, 0, 128, 128);
if (f.beard === 2) {
g.fillStyle = hair;
g.beginPath();
g.moveTo(26, 62); g.lineTo(26, 104); g.quadraticCurveTo(28, 126, 64, 126); g.quadraticCurveTo(100, 126, 102, 104);
g.lineTo(102, 62); g.lineTo(88, 62); g.quadraticCurveTo(88, 84, 64, 86); g.quadraticCurveTo(40, 84, 40, 62);
g.closePath(); g.fill();
} else if (f.beard === 1) {
const r = makeRng(f.skin * 7 + 3);
g.fillStyle = hair; g.globalAlpha = 0.45;
for (let i = 0; i < 200; i += 1) g.fillRect(26 + r() * 76, 78 + r() * 48, 2, 2);
g.globalAlpha = 1;
}
if (f.beard) { g.fillStyle = skin; el(64, 97, 16, 9); }
g.strokeStyle = hair; g.lineCap = 'round'; g.lineWidth = f.brow === 2 ? 6 : 4;
for (const q of [-1, 1]) {
const bx = 64 + q * 22;
g.beginPath();
if (f.brow === 1) { g.moveTo(bx - 13, 40); g.quadraticCurveTo(bx, 32, bx + 13, 39); }
else if (f.brow === 2) { g.moveTo(bx - 13, q < 0 ? 33 : 41); g.lineTo(bx + 13, q < 0 ? 41 : 33); }
else { g.moveTo(bx - 13, 37); g.lineTo(bx + 13, 37); }
g.stroke();
}
for (const q of [-1, 1]) {
const cx = 64 + q * 22, cy = 55;
g.fillStyle = '#fff'; el(cx, cy, 10, 6);
g.fillStyle = f.eye; ar(cx, cy, 4.6);
g.fillStyle = '#111'; ar(cx, cy, 2.3);
g.fillStyle = 'rgba(255,255,255,0.9)'; ar(cx - 1.6, cy - 1.8, 1.3);
g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 2;
g.beginPath(); g.ellipse(cx, cy - 1, 10, 6, 0, Math.PI * 1.05, Math.PI * 1.95); g.stroke();
}
g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 2.5; ln(60, 63, 59, 76); ln(68, 63, 69, 76);
g.fillStyle = 'rgba(0,0,0,0.35)'; el(60, 79, 2.6, 1.8); el(68, 79, 2.6, 1.8);
g.strokeStyle = 'rgba(255,255,255,0.3)'; g.lineWidth = 3; ln(64, 58, 64, 74);
if (f.blush) { g.fillStyle = 'rgba(230,110,130,0.28)'; el(38, 82, 9, 6); el(90, 82, 9, 6); }
if (f.lip) { g.fillStyle = '#b04a5a'; el(64, 99, 11, 4); }
g.strokeStyle = f.lip ? '#8a3040' : 'rgba(90,40,40,0.8)'; g.lineWidth = 3;
g.beginPath();
if (f.mouth === 1) { g.moveTo(50, 94); g.quadraticCurveTo(64, 102, 78, 94); }
else if (f.mouth === 2) { g.moveTo(48, 93); g.quadraticCurveTo(64, 105, 80, 93); }
else { g.moveTo(51, 96); g.lineTo(77, 96); }
g.stroke();
g.restore();
}

const faceTexCache = new Map();
function faceTexture(f) {
const key = [f.skin, f.eye, f.brow, f.mouth, f.beard, f.blush ? 1 : 0, f.lip ? 1 : 0, f.hairC].join('|');
let t = faceTexCache.get(key);
if (!t) {
const c = document.createElement('canvas');
c.width = 128; c.height = 128;
drawFace(c.getContext('2d'), f, 1);
t = new THREE.CanvasTexture(c);
t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
faceTexCache.set(key, t);
}
return t;
}

function drawHair2D(g, f) {
const st = f.hair;
if (st === 'bald') return;
if (st === 'cap' || st === 'policecap') {
g.fillStyle = st === 'policecap' ? '#1a2530' : css(f.hairC);
g.beginPath(); g.ellipse(72, 26, 58, 26, 0, Math.PI, Math.PI * 2); g.fill();
g.fillRect(14, 22, 116, 8);
g.beginPath(); g.ellipse(72, 30, 62, 8, 0, 0, 7); g.fill();
if (st === 'policecap') { g.fillStyle = '#ffc94d'; g.beginPath(); g.arc(72, 14, 5, 0, 7); g.fill(); }
return;
}
g.fillStyle = css(f.hairC);
if (st === 'mohawk') {
g.beginPath();
g.moveTo(58, 36); g.lineTo(62, 2); g.lineTo(68, 22); g.lineTo(74, 0); g.lineTo(80, 20); g.lineTo(86, 4); g.lineTo(88, 36);
g.closePath(); g.fill();
return;
}
g.beginPath(); g.ellipse(72, 30, 56, st === 'buzz' ? 26 : 34, 0, Math.PI, Math.PI * 2); g.fill();
if (st === 'long' || st === 'bob') {
g.fillRect(14, 26, 14, st === 'long' ? 78 : 66);
g.fillRect(116, 26, 14, st === 'long' ? 78 : 66);
} else if (st === 'pony') {
g.beginPath(); g.arc(124, 62, 10, 0, 7); g.fill();
g.fillRect(118, 62, 12, 34);
} else if (st === 'bun') {
g.beginPath(); g.arc(72, 2, 12, 0, 7); g.fill();
}
}

const portraitCache = new Map();
export function getPortrait(who) {
const key = who || 'lena';
let u = portraitCache.get(key);
if (u) return u;
const f = { ...(LOOKS[key] || LOOKS.lena) };
const ch = CHARACTERS[key] || CHARACTERS.lena;
const c = document.createElement('canvas');
c.width = 144; c.height = 144;
const g = c.getContext('2d');
const bg = g.createLinearGradient(0, 0, 0, 144);
bg.addColorStop(0, ch.color); bg.addColorStop(1, '#10131a');
g.fillStyle = bg; g.fillRect(0, 0, 144, 144);
if (f.tank) {
g.fillStyle = css(f.skin);
g.beginPath();
g.moveTo(10, 144); g.quadraticCurveTo(16, 106, 46, 100); g.lineTo(98, 100);
g.quadraticCurveTo(128, 106, 134, 144); g.closePath(); g.fill();
g.fillStyle = css(f.shirt ?? 0x3a3a4a);
g.beginPath();
g.moveTo(40, 144); g.quadraticCurveTo(44, 104, 54, 100); g.lineTo(90, 100);
g.quadraticCurveTo(100, 104, 104, 144); g.closePath(); g.fill();
} else {
g.fillStyle = css(f.shirt ?? 0x3a3a4a);
g.beginPath();
g.moveTo(10, 144); g.quadraticCurveTo(16, 106, 46, 100); g.lineTo(98, 100);
g.quadraticCurveTo(128, 106, 134, 144); g.closePath(); g.fill();
}
g.save();
g.beginPath(); g.ellipse(72, 60, 54, 58, 0, 0, 7); g.clip();
g.translate(8, 2);
drawFace(g, f, 1);
g.restore();
drawHair2D(g, f);
u = c.toDataURL();
portraitCache.set(key, u);
return u;
}

const boxGeo = new THREE.BoxGeometry(1, 1, 1);

function addHair(g, style, hm, cm) {
const put = (w, h, d, x, y, z, m) => {
const b = new THREE.Mesh(boxGeo, m || hm);
b.scale.set(w, h, d); b.position.set(x, y, z); g.add(b);
};
if (style === 'bald') return;
if (style === 'cap' || style === 'policecap') {
put(0.44, 0.12, 0.44, 0, 0.22, 0, cm);
put(0.44, 0.04, 0.26, 0, 0.17, -0.3, cm);
if (style === 'policecap') put(0.1, 0.06, 0.02, 0, 0.22, -0.23, new THREE.MeshLambertMaterial({ color: 0xffc94d }));
return;
}
if (style === 'mohawk') {
put(0.1, 0.3, 0.4, 0, 0.34, 0);
put(0.08, 0.12, 0.1, 0, 0.52, -0.13);
put(0.08, 0.16, 0.1, 0, 0.54, 0);
put(0.08, 0.12, 0.1, 0, 0.52, 0.13);
return;
}
put(0.44, style === 'buzz' ? 0.05 : 0.1, 0.44, 0, style === 'buzz' ? 0.21 : 0.2, 0);
if (style === 'buzz' || style === 'slick') { put(0.43, 0.3, 0.06, 0, 0.02, 0.2); return; }
put(0.44, 0.24, 0.08, 0, 0.08, 0.19);
if (style === 'long' || style === 'bob') {
const hh = style === 'long' ? 0.34 : 0.4, yy = style === 'long' ? 0 : -0.02;
put(0.08, hh, 0.3, -0.19, yy, 0.04);
put(0.08, hh, 0.3, 0.19, yy, 0.04);
if (style === 'long') put(0.44, 0.5, 0.08, 0, -0.06, 0.2);
else put(0.44, 0.4, 0.08, 0, -0.02, 0.19);
} else if (style === 'pony') {
put(0.12, 0.34, 0.12, 0, -0.02, 0.26);
put(0.14, 0.06, 0.14, 0, 0.14, 0.24);
} else if (style === 'bun') {
put(0.18, 0.18, 0.14, 0, 0.16, 0.24);
}
}

export function buildPersonRig(o = {}) {
const base = LOOKS[o.face] || {};
const f = {
skin: SKIN[0], eye: EYES[0], brow: 1, mouth: 1, beard: 0, hair: 'short', hairC: 0x2a2018,
shirt: 0x3a6a8a, pants: 0x2a3a5a, capColor: 0x222222, shoe: 0x222222,
...base, ...o,
};
const g = new THREE.Group();
const cache = new Map();
const M = (c) => {
let m = cache.get(c);
if (!m) { m = new THREE.MeshLambertMaterial({ color: c }); cache.set(c, m); }
return m;
};
const skinM = M(f.skin), shirtM = M(f.shirt), pantsM = M(f.pants), hairM = M(f.hairC);
const sleeveM = f.tank ? skinM : shirtM;
const put = (parent, w, h, d, x, y, z, m, shadow) => {
const b = new THREE.Mesh(boxGeo, m);
b.scale.set(w, h, d); b.position.set(x, y, z);
if (shadow) b.castShadow = true;
parent.add(b);
return b;
};
const torsoG = new THREE.Group();
torsoG.position.y = 0.86;
g.add(torsoG);
put(torsoG, 0.62, 0.78, 0.34, 0, 0.39, 0, shirtM, true);
if (f.jacket) put(torsoG, 0.3, 0.58, 0.02, 0, 0.42, -0.18, M(0xe8e8e8));
put(torsoG, 0.64, 0.07, 0.36, 0, 0.05, 0, M(0x222222));
put(torsoG, 0.42, 0.08, 0.36, 0, 0.76, 0, M(shade(f.shirt, 0.7)));
put(torsoG, 0.2, 0.18, 0.3, -0.36, 0.68, 0, sleeveM);
put(torsoG, 0.2, 0.18, 0.3, 0.36, 0.68, 0, sleeveM);
if (f.female) {
put(torsoG, 0.16, 0.16, 0.1, -0.14, 0.5, -0.19, shirtM);
put(torsoG, 0.16, 0.16, 0.1, 0.14, 0.5, -0.19, shirtM);
}
put(torsoG, 0.16, 0.12, 0.16, 0, 0.82, 0, skinM);
const headG = new THREE.Group();
headG.position.y = 1.86;
g.add(headG);
const faceM = new THREE.MeshLambertMaterial({ map: faceTexture(f) });
const head = new THREE.Mesh(boxGeo, [skinM, skinM, skinM, skinM, skinM, faceM]);
head.scale.set(0.4, 0.42, 0.4);
head.castShadow = true;
headG.add(head);
put(headG, 0.05, 0.12, 0.1, -0.21, 0, 0, skinM);
put(headG, 0.05, 0.12, 0.1, 0.21, 0, 0, skinM);
addHair(headG, f.hair, hairM, M(f.capColor));
const mkArm = (side) => {
const p = new THREE.Group();
p.position.set(side * 0.42, 1.56, 0);
g.add(p);
put(p, 0.17, 0.32, 0.17, 0, -0.16, 0, sleeveM, true);
const el = new THREE.Group();
el.position.y = -0.32;
p.add(el);
put(el, 0.15, 0.26, 0.15, 0, -0.13, 0, f.longSleeve ? shirtM : skinM, true);
put(el, 0.14, 0.12, 0.14, 0, -0.3, 0, skinM);
return { pivot: p, elbow: el };
};
const mkLeg = (side) => {
const p = new THREE.Group();
p.position.set(side * 0.16, 0.84, 0);
g.add(p);
put(p, 0.23, 0.4, 0.23, 0, -0.2, 0, pantsM, true);
const kn = new THREE.Group();
kn.position.y = -0.4;
p.add(kn);
put(kn, 0.2, 0.34, 0.2, 0, -0.17, 0, pantsM, true);
put(kn, 0.21, 0.09, 0.3, 0, -0.36, -0.04, M(f.shoe));
return { pivot: p, knee: kn };
};
const aL = mkArm(-1), aR = mkArm(1), lL = mkLeg(-1), lR = mkLeg(1);
g.scale.set(f.build || 1, f.height || 1, f.build || 1);
return {
group: g, torso: torsoG, head: headG,
armL: aL.pivot, armR: aR.pivot, elbowL: aL.elbow, elbowR: aR.elbow,
legL: lL.pivot, legR: lR.pivot, kneeL: lL.knee, kneeR: lR.knee,
phase: 0, seed: Math.random() * 10,
};
}

export function animateRig(rig, speed, dt, aiming) {
rig.phase += speed * dt * 1.9;
const s = Math.sin(rig.phase), c = Math.cos(rig.phase);
const amp = clamp(speed / 5, 0, 1) * 0.6;
const t = performance.now() * 0.001 + rig.seed;
rig.legL.rotation.x = s * amp;
rig.legR.rotation.x = -s * amp;
rig.kneeL.rotation.x = -Math.max(0, s) * amp * 1.15 - amp * 0.06;
rig.kneeR.rotation.x = -Math.max(0, -s) * amp * 1.15 - amp * 0.06;
if (aiming) {
rig.armR.rotation.x = -Math.PI / 2 + 0.1;
rig.elbowR.rotation.x = -0.15;
rig.armL.rotation.x = -0.85;
rig.elbowL.rotation.x = -0.7;
rig.head.rotation.y = 0;
rig.torso.rotation.y = 0.12;
} else {
rig.armL.rotation.x = -s * amp * 0.8;
rig.armR.rotation.x = s * amp * 0.8;
rig.elbowL.rotation.x = -0.25 - amp * 0.35;
rig.elbowR.rotation.x = -0.25 - amp * 0.35;
rig.torso.rotation.y = 0;
rig.head.rotation.y = amp < 0.05 ? Math.sin(t * 0.45) * 0.22 : 0;
}
rig.torso.rotation.x = amp * 0.09;
rig.torso.scale.y = 1 + Math.sin(t * 1.7) * 0.012 * (1 - amp);
rig.group.position.y = Math.abs(c) * 0.03 * amp;
}

function randomLook(rng, role) {
const female = rng() < 0.45;
const styles = female ? ['long', 'bob', 'pony', 'bun', 'short'] : ['short', 'buzz', 'slick', 'short', 'bald', 'cap'];
const hair = role === 'rival' && rng() < 0.35 ? 'cap' : styles[(rng() * styles.length) | 0];
return {
skin: SKIN[(rng() * SKIN.length) | 0],
shirt: role === 'rival' ? (rng() < 0.5 ? 0x8a2e2e : 0x6a2a3a) : SHIRTS[(rng() * SHIRTS.length) | 0],
pants: role === 'rival' ? 0x2a2a2e : PANTS[(rng() * PANTS.length) | 0],
eye: EYES[(rng() * EYES.length) | 0],
brow: (rng() * 3) | 0, mouth: (rng() * 3) | 0,
beard: female || rng() < 0.55 ? 0 : 1 + ((rng() * 2) | 0),
blush: female && rng() < 0.5, lip: female && rng() < 0.4,
hair, hairC: HAIRC[(rng() * HAIRC.length) | 0], female: female ? 1 : 0,
capColor: role === 'rival' ? 0x222222 : SHIRTS[(rng() * SHIRTS.length) | 0],
height: 0.94 + rng() * 0.12,
build: role === 'rival' ? 1.02 + rng() * 0.12 : 0.92 + rng() * 0.16,
shoe: [0x222222, 0x4a3018, 0xe8e8e8, 0x6a2a2a][(rng() * 4) | 0],
jacket: rng() < 0.3,
};
}

function randomSidewalkPoint(rng) {
const roads = WORLD.roads;
const r = roads[(rng() * roads.length) | 0];
const alongX = rng() < 0.5;
const t = -210 + rng() * 420;
return alongX ? { x: t, z: r + (rng() < 0.5 ? -10.5 : 10.5) } : { x: r + (rng() < 0.5 ? -10.5 : 10.5), z: t };
}

export function createPedestrians() {
const rng = makeRng(777);
for (let i = 0; i < TUNE.pedCount; i += 1) {
const p = randomSidewalkPoint(rng);
const rig = buildPersonRig(randomLook(rng, 'ped'));
rig.group.position.set(p.x, 0.3, p.z);
S.scene.add(rig.group);
S.peds.push({
rig, pos: rig.group.position, heading: rng() * Math.PI * 2,
target: randomSidewalkPoint(rng), speed: 1.6 + rng() * 1.2,
state: 'walk', stateTimer: 0, down: false, hostile: false, hostileTimer: 0, punchTimer: 0, punches: 0, punchAnim: 0,
});
}
}

function pedCollide(ped) {
for (const b of S.colliders) {
const hit = circleVsBox(ped.pos.x, ped.pos.z, 0.5, b);
if (hit) { ped.pos.x = hit.x; ped.pos.z = hit.z; }
}
ped.pos.x = clamp(ped.pos.x, -224, 238);
ped.pos.z = clamp(ped.pos.z, -238, 238);
}

export function updatePedestrians(dt) {
const threat = S.player ? S.player.pos : null;
for (const ped of S.peds) {
if (ped.down) {
ped.stateTimer -= dt;
if (ped.stateTimer <= 0) {
const p = randomSidewalkPoint(makeRng((Math.random() * 1e9) | 0));
ped.pos.set(p.x, 0.3, p.z);
ped.rig.group.rotation.x = 0;
ped.rig.group.visible = true;
ped.down = false;
ped.state = 'walk';
ped.hostile = false;
ped.punches = 0;
}
continue;
}
if (ped.hostile && threat) {
const d = dist2D(ped.pos.x, ped.pos.z, threat.x, threat.z);
ped.hostileTimer -= dt;
if (ped.hostileTimer <= 0 || d > 30 || S.driving) {
ped.hostile = false;
ped.punches = 0;
ped.state = 'walk';
} else {
const want = Math.atan2(-(threat.z - ped.pos.z), threat.x - ped.pos.x);
ped.heading = damp(ped.heading, want, 8, dt);
if (d > 1.8) {
ped.pos.x += Math.cos(ped.heading) * 4.6 * dt;
ped.pos.z += -Math.sin(ped.heading) * 4.6 * dt;
pedCollide(ped);
}
ped.punchTimer -= dt;
if (d <= 2.0 && ped.punchTimer <= 0) {
ped.punchTimer = 0.9;
ped.punchAnim = 0.3;
S.playerDamage?.(6, ped.pos.x, ped.pos.z);
S.effects?.burst(threat.x, 1.2, threat.z, 0xffcc66, 3, 2);
}
ped.rig.group.rotation.y = ped.heading - Math.PI / 2;
animateRig(ped.rig, d > 1.8 ? 4.6 : 0, dt, false);
if (ped.punchAnim > 0) {
ped.punchAnim -= dt;
ped.rig.armR.rotation.x = -1.7;
ped.rig.elbowR.rotation.x = -0.1;
}
continue;
}
}
let fleeing = ped.state === 'flee';
const fleeRadius = Math.max(12, 30 - S.respect * 0.15);
if (threat && S.playerFiredTimer > 0 && dist2D(ped.pos.x, ped.pos.z, threat.x, threat.z) < fleeRadius) fleeing = true;
if (S.wanted > 0 && dist2D(ped.pos.x, ped.pos.z, threat.x, threat.z) < Math.max(10, 22 - S.respect * 0.1)) fleeing = true;
if (fleeing) {
ped.state = 'flee';
ped.stateTimer = 2.5;
const away = Math.atan2(-(ped.pos.z - threat.z), ped.pos.x - threat.x);
ped.heading = damp(ped.heading, away, 4, dt);
ped.pos.x += Math.cos(ped.heading) * 5.4 * dt;
ped.pos.z += -Math.sin(ped.heading) * 5.4 * dt;
pedCollide(ped);
ped.rig.group.rotation.y = ped.heading - Math.PI / 2;
animateRig(ped.rig, 5.4, dt, false);
ped.stateTimer -= dt;
if (ped.stateTimer <= 0) ped.state = 'walk';
continue;
}
const dx = ped.target.x - ped.pos.x, dz = ped.target.z - ped.pos.z;
const d = Math.hypot(dx, dz);
if (d < 3) {
ped.target = randomSidewalkPoint(makeRng((Math.random() * 1e9) | 0));
} else {
const want = Math.atan2(-dz, dx);
ped.heading = damp(ped.heading, want, 5, dt);
ped.pos.x += Math.cos(ped.heading) * ped.speed * dt;
ped.pos.z += -Math.sin(ped.heading) * ped.speed * dt;
pedCollide(ped);
}
ped.rig.group.rotation.y = ped.heading - Math.PI / 2;
animateRig(ped.rig, ped.speed, dt, false);
}
}

export function angerPed(ped, fromX, fromZ) {
ped.punches = (ped.punches || 0) + 1;
if (ped.punches >= 3) {
knockPed(ped, fromX, fromZ);
return;
}
ped.hostile = true;
ped.hostileTimer = 12;
ped.punchTimer = 0.5;
S.effects?.burst(ped.pos.x, 1.4, ped.pos.z, 0xcc4444, 4, 2);
S.audio?.thud(5);
}

export function knockPed(ped, fromX, fromZ) {
if (ped.down) return;
ped.down = true;
ped.hostile = false;
ped.stateTimer = 6;
ped.rig.group.rotation.x = Math.PI / 2 - 0.15;
ped.rig.group.rotation.y = Math.atan2(-(ped.pos.z - fromZ), ped.pos.x - fromX) - Math.PI / 2;
S.effects?.burst(ped.pos.x, 1, ped.pos.z, 0xcc4444, 6, 2);
}

export function spawnRival(x, z, opts = {}) {
const rig = buildPersonRig(randomLook(makeRng((Math.random() * 1e9) | 0), 'rival'));
rig.group.position.set(x, 0.3, z);
if (opts.boss) rig.group.scale.multiplyScalar(1.14);
S.scene.add(rig.group);
const rival = {
rig, pos: rig.group.position, heading: Math.random() * Math.PI * 2,
health: opts.health ?? 60, state: 'guard',
shootTimer: 1 + Math.random(), strafeDir: Math.random() < 0.5 ? 1 : -1, strafeTimer: 0,
home: { x, z }, accuracy: opts.accuracy ?? 0.3, damage: opts.damage ?? 7,
down: false, fade: 1, boss: !!opts.boss,
};
S.rivals.push(rival);
return rival;
}

export function updateRivals(dt) {
if (!S.player) return;
for (const r of S.rivals) {
if (r.down) {
r.fade -= dt * 0.5;
r.rig.group.traverse((o) => {
if (o.isMesh) {
const ms = Array.isArray(o.material) ? o.material : [o.material];
for (const m of ms) { m.transparent = true; m.opacity = Math.max(0, r.fade); }
}
});
continue;
}
const d = dist2D(r.pos.x, r.pos.z, S.player.pos.x, S.player.pos.z);
const seesPlayer = d < 55 && (S.mission?.combat || d < 20 || S.playerFiredTimer > 0);
if (seesPlayer) r.state = 'engage';
if (r.state === 'engage') {
const want = Math.atan2(-(S.player.pos.z - r.pos.z), S.player.pos.x - r.pos.x);
r.heading = damp(r.heading, want, 6, dt);
r.strafeTimer -= dt;
if (r.strafeTimer <= 0) { r.strafeDir *= -1; r.strafeTimer = 1.5 + Math.random(); }
let mx = 0, mz = 0;
if (d > 18) { mx = Math.cos(want); mz = -Math.sin(want); }
else if (d < 9) { mx = -Math.cos(want); mz = Math.sin(want); }
const sx = -Math.sin(want) * r.strafeDir, sz = -Math.cos(want) * r.strafeDir;
const sp = 3.4;
r.pos.x += (mx + sx * 0.7) * sp * dt;
r.pos.z += (mz + sz * 0.7) * sp * dt;
for (const b of S.colliders) {
const hit = circleVsBox(r.pos.x, r.pos.z, 0.5, b);
if (hit) { r.pos.x = hit.x; r.pos.z = hit.z; }
}
if (S.swimming) r.pos.x = Math.max(r.pos.x, -224);
r.rig.group.rotation.y = r.heading - Math.PI / 2;
animateRig(r.rig, sp, dt, true);
r.shootTimer -= dt;
if (r.shootTimer <= 0 && d < 48) {
r.shootTimer = 0.9 + Math.random() * 0.9;
S.effects?.muzzle(r.pos.x, 1.5, r.pos.z, r.heading);
S.audio?.shot(d, false);
if (Math.random() < r.accuracy * clamp(1.3 - d / 45, 0.25, 1)) {
S.playerDamage?.(r.damage, r.pos.x, r.pos.z);
} else {
S.effects?.burst(S.player.pos.x + (Math.random() - 0.5) * 3, 1.2, S.player.pos.z + (Math.random() - 0.5) * 3, 0xcccccc, 3, 2);
}
}
} else {
r.rig.group.rotation.y = r.heading - Math.PI / 2 + Math.sin(performance.now() * 0.0004 + r.home.x) * 0.4;
animateRig(r.rig, 0, dt, false);
}
}
for (let i = S.rivals.length - 1; i >= 0; i -= 1) {
if (S.rivals[i].down && S.rivals[i].fade <= 0) {
S.scene.remove(S.rivals[i].rig.group);
S.rivals.splice(i, 1);
}
}
}

export function damageRival(rival, dmg, fromX, fromZ) {
if (rival.down) return false;
rival.health -= dmg;
rival.state = 'engage';
S.effects?.burst(rival.pos.x, 1.4, rival.pos.z, 0xcc4444, 5, 2.5);
if (rival.health <= 0) {
rival.down = true;
rival.rig.group.rotation.x = Math.PI / 2 - 0.1;
rival.rig.group.rotation.y = Math.atan2(-(rival.pos.z - fromZ), rival.pos.x - fromX) - Math.PI / 2;
S.stats.rivalsDown += 1;
addRespect(1);
S.audio?.thud(6);
return true;
}
return false;
}

export function clearRivals() {
for (const r of S.rivals) S.scene.remove(r.rig.group);
S.rivals.length = 0;
}
