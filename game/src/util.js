export function makeRng(seed) {
let a = seed >>> 0;
return function rng() {
a |= 0; a = (a + 0x6d2b79f5) | 0;
let t = Math.imul(a ^ (a >>> 15), 1 | a);
t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
}

export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const roadWave = (s) => 2 * Math.sin(s * Math.PI / 60);
export const roadWaveSlope = (s) => (Math.PI / 30) * Math.cos(s * Math.PI / 60);
export const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));

export function angleDelta(a, b) {
let d = (b - a) % (Math.PI * 2);
if (d > Math.PI) d -= Math.PI * 2;
if (d < -Math.PI) d += Math.PI * 2;
return d;
}

export function dampAngle(a, b, lambda, dt) {
return a + angleDelta(a, b) * (1 - Math.exp(-lambda * dt));
}

export function dist2D(ax, az, bx, bz) {
const dx = ax - bx, dz = az - bz;
return Math.sqrt(dx * dx + dz * dz);
}

export function circleVsBox(x, z, r, box) {
const cx = clamp(x, box.x0, box.x1);
const cz = clamp(z, box.z0, box.z1);
const dx = x - cx, dz = z - cz;
const d2 = dx * dx + dz * dz;
if (d2 >= r * r) return null;
if (d2 > 1e-9) {
const d = Math.sqrt(d2);
return { x: cx + (dx / d) * r, z: cz + (dz / d) * r, nx: dx / d, nz: dz / d };
}

const pl = x - box.x0, pr = box.x1 - x, pn = z - box.z0, pf = box.z1 - z;
const m = Math.min(pl, pr, pn, pf);
if (m === pl) return { x: box.x0 - r, z, nx: -1, nz: 0 };
if (m === pr) return { x: box.x1 + r, z, nx: 1, nz: 0 };
if (m === pn) return { x, z: box.z0 - r, nx: 0, nz: -1 };
return { x, z: box.z1 + r, nx: 0, nz: 1 };
}

export function segmentHitsBox(x0, z0, x1, z1, box) {
let tmin = 0, tmax = 1;
const dx = x1 - x0, dz = z1 - z0;
for (const [o, d, lo, hi] of [[x0, dx, box.x0, box.x1], [z0, dz, box.z0, box.z1]]) {
if (Math.abs(d) < 1e-9) {
if (o < lo || o > hi) return false;
} else {
let t1 = (lo - o) / d, t2 = (hi - o) / d;
if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
if (tmin > tmax) return false;
}
}
return true;
}

export function formatClock(dayTime) {
const total = Math.floor(dayTime * 24 * 60);
const h = String(Math.floor(total / 60)).padStart(2, '0');
const m = String(total % 60).padStart(2, '0');
return `${h}:${m}`;
}

export function formatMoney(n) {
return '$' + Math.round(n).toLocaleString('en-US');
}
