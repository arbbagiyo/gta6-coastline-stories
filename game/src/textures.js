import * as THREE from 'three';
import { makeRng } from './util.js';

function canvasTexture(w, h, draw) {
const c = document.createElement('canvas');
c.width = w; c.height = h;
draw(c.getContext('2d'), w, h);
const t = new THREE.CanvasTexture(c);
t.colorSpace = THREE.SRGBColorSpace;
t.anisotropy = 4;
return t;
}

function facadeTexture(tint, rng, lit) {
return canvasTexture(128, 256, (g, w, h) => {
g.fillStyle = tint;
g.fillRect(0, 0, w, h);

const grad = g.createLinearGradient(0, 0, 0, h);
grad.addColorStop(0, 'rgba(255,255,255,0.10)');
grad.addColorStop(1, 'rgba(0,0,0,0.22)');
g.fillStyle = grad;
g.fillRect(0, 0, w, h);
const cols = 5, rows = 10;
const cw = w / cols, rh = h / rows;
for (let y = 0; y < rows; y += 1) {
for (let x = 0; x < cols; x += 1) {
const wx = x * cw + cw * 0.22, wy = y * rh + rh * 0.25;
const ww = cw * 0.56, wh = rh * 0.5;
if (lit) {
g.fillStyle = rng() < 0.42 ? '#ffd98a' : '#20242e';
} else {
g.fillStyle = rng() < 0.5 ? '#2c3a48' : '#3d5568';
}
g.fillRect(wx, wy, ww, wh);
g.fillStyle = 'rgba(255,255,255,0.25)';
g.fillRect(wx, wy, ww, 2);
}
}

if (!lit) {
g.fillStyle = 'rgba(20,20,24,0.55)';
g.fillRect(0, h - 26, w, 26);
}
});
}

export function makeFacadeSet(seed) {
const rng = makeRng(seed);
const tints = ['#ffd9b8', '#c8ecdc', '#c0dcf0', '#ffe9a8', '#f7c8d0', '#d8c8f0', '#ffe0c0', '#c8e8e0'];
return tints.map((tint) => {
const map = facadeTexture(tint, rng, false);
const emissive = facadeTexture('#101014', rng, true);
return { map, emissive };
});
}

export function makeRoadTexture() {
const t = canvasTexture(256, 256, (g, w, h) => {
g.fillStyle = '#33363b';
g.fillRect(0, 0, w, h);

const rng = makeRng(77);
for (let i = 0; i < 900; i += 1) {
g.fillStyle = rng() < 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.08)';
g.fillRect(rng() * w, rng() * h, 2, 2);
}

g.fillStyle = '#c8c8c8';
// Edge lines run along the road: in the ribbon's UVs, v spans the width
// and u runs the length, so a stripe of constant v is a line down the road.
g.fillRect(0, 6, w, 3);
g.fillRect(0, h - 9, w, 3);
});
t.wrapS = THREE.RepeatWrapping;
t.wrapT = THREE.RepeatWrapping;
return t;
}

export function makeSidewalkTexture() {
const t = canvasTexture(128, 128, (g, w, h) => {
g.fillStyle = '#b3afa2';
g.fillRect(0, 0, w, h);
g.strokeStyle = 'rgba(0,0,0,0.25)';
g.lineWidth = 2;
for (let i = 0; i <= 4; i += 1) {
g.beginPath(); g.moveTo(i * 32, 0); g.lineTo(i * 32, h); g.stroke();
g.beginPath(); g.moveTo(0, i * 32); g.lineTo(w, i * 32); g.stroke();
}
const rng = makeRng(31);
for (let i = 0; i < 200; i += 1) {
g.fillStyle = 'rgba(0,0,0,0.05)';
g.fillRect(rng() * w, rng() * h, 3, 3);
}
});
t.wrapS = THREE.RepeatWrapping;
t.wrapT = THREE.RepeatWrapping;
return t;
}

export function makeSandTexture() {
const t = canvasTexture(128, 128, (g, w, h) => {
g.fillStyle = '#e0d199';
g.fillRect(0, 0, w, h);
const rng = makeRng(55);
for (let i = 0; i < 700; i += 1) {
g.fillStyle = rng() < 0.5 ? 'rgba(160,140,90,0.25)' : 'rgba(255,250,220,0.3)';
g.fillRect(rng() * w, rng() * h, 2, 2);
}
});
t.wrapS = THREE.RepeatWrapping;
t.wrapT = THREE.RepeatWrapping;
return t;
}

export function makeWaterTexture() {
const t = canvasTexture(128, 128, (g, w, h) => {
g.fillStyle = '#1d6f8e';
g.fillRect(0, 0, w, h);
const rng = makeRng(99);
g.strokeStyle = 'rgba(255,255,255,0.18)';
g.lineWidth = 2;
for (let i = 0; i < 26; i += 1) {
const y = rng() * h;
g.beginPath();
g.moveTo(0, y);
g.bezierCurveTo(w * 0.3, y + 6, w * 0.6, y - 6, w, y + 2);
g.stroke();
}
});
t.wrapS = THREE.RepeatWrapping;
t.wrapT = THREE.RepeatWrapping;
return t;
}

export function makeGrassTexture() {
const t = canvasTexture(128, 128, (g, w, h) => {
g.fillStyle = '#8aa86b';
g.fillRect(0, 0, w, h);
const rng = makeRng(41);
for (let i = 0; i < 900; i += 1) {
g.fillStyle = rng() < 0.5 ? 'rgba(60,90,40,0.25)' : 'rgba(170,200,120,0.25)';
g.fillRect(rng() * w, rng() * h, 2, 3);
}
});
t.wrapS = THREE.RepeatWrapping;
t.wrapT = THREE.RepeatWrapping;
return t;
}

export function makeSignTexture(text, bg, fg) {
return canvasTexture(256, 64, (g, w, h) => {
g.fillStyle = bg;
g.fillRect(0, 0, w, h);
g.strokeStyle = 'rgba(255,255,255,0.6)';
g.lineWidth = 4;
g.strokeRect(3, 3, w - 6, h - 6);
g.fillStyle = fg;
g.font = 'bold 30px Verdana, sans-serif';
g.textAlign = 'center';
g.textBaseline = 'middle';
g.fillText(text, w / 2, h / 2 + 1);
});
}

export function makeGlowTexture() {
return canvasTexture(64, 64, (g, w, h) => {
const grad = g.createRadialGradient(32, 32, 2, 32, 32, 30);
grad.addColorStop(0, 'rgba(255,255,255,1)');
grad.addColorStop(0.35, 'rgba(255,255,255,0.6)');
grad.addColorStop(1, 'rgba(255,255,255,0)');
g.fillStyle = grad;
g.fillRect(0, 0, w, h);
});
}

export function makeContainerTexture() {
const t = canvasTexture(256, 128, (g, w, h) => {
g.fillStyle = '#d9d9d9';
g.fillRect(0, 0, w, h);
for (let x = 0; x < w; x += 16) {
g.fillStyle = 'rgba(0,0,0,0.18)';
g.fillRect(x, 0, 4, h);
g.fillStyle = 'rgba(255,255,255,0.14)';
g.fillRect(x + 8, 0, 4, h);
}
g.fillStyle = 'rgba(0,0,0,0.28)';
g.fillRect(0, 0, w, 8);
g.fillRect(0, h - 8, w, 8);
g.fillRect(0, 0, 6, h);
g.fillRect(w - 6, 0, 6, h);
g.fillStyle = 'rgba(0,0,0,0.35)';
g.fillRect(w - 62, 10, 3, h - 20);
g.fillRect(w - 32, 10, 3, h - 20);
for (let y = 18; y < h - 10; y += 26) g.fillRect(w - 62, y, 56, 3);
const rng = makeRng(41);
for (let i = 0; i < 120; i += 1) {
g.fillStyle = rng() < 0.5 ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.07)';
g.fillRect(rng() * w, rng() * h, 6, 4);
}
});
return t;
}

export function makeDotTexture() {
return canvasTexture(32, 32, (g) => {
const grad = g.createRadialGradient(16, 16, 1, 16, 16, 15);
grad.addColorStop(0, 'rgba(255,255,255,1)');
grad.addColorStop(1, 'rgba(255,255,255,0)');
g.fillStyle = grad;
g.fillRect(0, 0, 32, 32);
});
}

export function makeTaxiTexture() {
return canvasTexture(64, 32, (g, w, h) => {
g.fillStyle = '#f2c230';
g.fillRect(0, 0, w, h);
g.fillStyle = '#111';
for (let y = 0; y < 2; y += 1) for (let x = 0; x < 8; x += 1) {
if ((x + y) % 2 === 0) g.fillRect(x * 8, y * 8, 8, 8);
}
g.fillStyle = '#111';
g.font = 'bold 13px Verdana, sans-serif';
g.textAlign = 'center';
g.fillText('TAXI', w / 2, 27);
});
}
