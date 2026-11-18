import * as THREE from 'three';
import { S } from './state.js';
import { makeGlowTexture } from './textures.js';

const MAX_SPARKS = 600;
const MAX_SMOKE = 40;
const MAX_FLASH = 12;
const MAX_TRACER = 10;

export class Effects {
constructor(scene) {
this.scene = scene;


this.sparkPos = new Float32Array(MAX_SPARKS * 3);
this.sparkCol = new Float32Array(MAX_SPARKS * 3);
this.sparkVel = new Float32Array(MAX_SPARKS * 3);
this.sparkLife = new Float32Array(MAX_SPARKS);
this.sparkMax = new Float32Array(MAX_SPARKS);
this.sparkBase = new Float32Array(MAX_SPARKS * 3);
this.sparkHead = 0;
for (let i = 0; i < MAX_SPARKS; i += 1) this.sparkPos[i * 3 + 1] = -200;
const geo = new THREE.BufferGeometry();
geo.setAttribute('position', new THREE.BufferAttribute(this.sparkPos, 3));
geo.setAttribute('color', new THREE.BufferAttribute(this.sparkCol, 3));
const mat = new THREE.PointsMaterial({
size: 0.4, vertexColors: true, transparent: true,
blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
});
this.points = new THREE.Points(geo, mat);
this.points.frustumCulled = false;
this.points.raycast = () => {};
scene.add(this.points);

const glow = makeGlowTexture();
this.smokePool = [];
for (let i = 0; i < MAX_SMOKE; i += 1) {
const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, transparent: true, opacity: 0, depthWrite: false }));
sp.visible = false;
sp.raycast = () => {};
scene.add(sp);
this.smokePool.push({ sp, life: 0, max: 1 });
}
this.flashPool = [];
for (let i = 0; i < MAX_FLASH; i += 1) {
const sp = new THREE.Sprite(new THREE.SpriteMaterial({
map: glow, transparent: true, opacity: 0, depthWrite: false,
blending: THREE.AdditiveBlending, color: 0xffdd88,
}));
sp.visible = false;
sp.raycast = () => {};
scene.add(sp);
this.flashPool.push({ sp, life: 0, max: 1 });
}
this.tracerPool = [];
for (let i = 0; i < MAX_TRACER; i += 1) {
const g = new THREE.BufferGeometry();
g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
const line = new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0 }));
line.visible = false;
line.frustumCulled = false;
line.raycast = () => {};
scene.add(line);
this.tracerPool.push({ line, life: 0, max: 1 });
}
this.tmpColor = new THREE.Color();
}

burst(x, y, z, colorHex, count, power) {
this.tmpColor.setHex(colorHex);
for (let n = 0; n < count; n += 1) {
const i = this.sparkHead;
this.sparkHead = (this.sparkHead + 1) % MAX_SPARKS;
this.sparkPos[i * 3] = x;
this.sparkPos[i * 3 + 1] = y;
this.sparkPos[i * 3 + 2] = z;
const a = Math.random() * Math.PI * 2;
const up = Math.random() * power;
const sp = (0.4 + Math.random() * 0.6) * power;
this.sparkVel[i * 3] = Math.cos(a) * sp;
this.sparkVel[i * 3 + 1] = up;
this.sparkVel[i * 3 + 2] = Math.sin(a) * sp;
this.sparkBase[i * 3] = this.tmpColor.r;
this.sparkBase[i * 3 + 1] = this.tmpColor.g;
this.sparkBase[i * 3 + 2] = this.tmpColor.b;
this.sparkLife[i] = this.sparkMax[i] = 0.4 + Math.random() * 0.5;
}
}

smoke(x, y, z, colorHex) {
const slot = this.smokePool.find((s) => s.life <= 0);
if (!slot) return;
slot.life = slot.max = 1.1 + Math.random() * 0.5;
slot.sp.visible = true;
slot.sp.position.set(x, y, z);
slot.sp.material.color.setHex(colorHex);
slot.sp.material.opacity = 0.55;
slot.sp.scale.setScalar(0.8);
}

muzzle(x, y, z, heading) {
const slot = this.flashPool.find((s) => s.life <= 0);
if (slot) {
slot.life = slot.max = 0.07;
slot.sp.visible = true;
slot.sp.position.set(x + Math.cos(heading) * 0.7, y, z - Math.sin(heading) * 0.7);
slot.sp.material.opacity = 1;
slot.sp.scale.setScalar(1.1 + Math.random() * 0.5);
}
this.burst(x + Math.cos(heading) * 0.7, y, z - Math.sin(heading) * 0.7, 0xffcc55, 3, 2);
}

tracer(from, dir, length = 34) {
const slot = this.tracerPool.find((t) => t.life <= 0);
if (!slot) return;
slot.life = slot.max = 0.07;
slot.line.visible = true;
slot.line.material.opacity = 0.9;
const pos = slot.line.geometry.attributes.position.array;
pos[0] = from.x; pos[1] = from.y; pos[2] = from.z;
pos[3] = from.x + dir.x * length; pos[4] = from.y + dir.y * length; pos[5] = from.z + dir.z * length;
slot.line.geometry.attributes.position.needsUpdate = true;
}

update(dt) {
for (let i = 0; i < MAX_SPARKS; i += 1) {
if (this.sparkLife[i] <= 0) continue;
this.sparkLife[i] -= dt;
if (this.sparkLife[i] <= 0) {
this.sparkPos[i * 3 + 1] = -200;
this.sparkCol[i * 3] = this.sparkCol[i * 3 + 1] = this.sparkCol[i * 3 + 2] = 0;
continue;
}
this.sparkVel[i * 3 + 1] -= 9 * dt;
this.sparkPos[i * 3] += this.sparkVel[i * 3] * dt;
this.sparkPos[i * 3 + 1] += this.sparkVel[i * 3 + 1] * dt;
this.sparkPos[i * 3 + 2] += this.sparkVel[i * 3 + 2] * dt;
const f = this.sparkLife[i] / this.sparkMax[i];
this.sparkCol[i * 3] = this.sparkBase[i * 3] * f;
this.sparkCol[i * 3 + 1] = this.sparkBase[i * 3 + 1] * f;
this.sparkCol[i * 3 + 2] = this.sparkBase[i * 3 + 2] * f;
}
this.points.geometry.attributes.position.needsUpdate = true;
this.points.geometry.attributes.color.needsUpdate = true;
for (const s of this.smokePool) {
if (s.life <= 0) continue;
s.life -= dt;
if (s.life <= 0) { s.sp.visible = false; continue; }
const f = s.life / s.max;
s.sp.position.y += dt * 1.6;
s.sp.scale.setScalar(0.8 + (1 - f) * 2.2);
s.sp.material.opacity = 0.55 * f;
}
for (const f2 of this.flashPool) {
if (f2.life <= 0) continue;
f2.life -= dt;
if (f2.life <= 0) { f2.sp.visible = false; continue; }
f2.sp.material.opacity = f2.life / f2.max;
}
for (const t of this.tracerPool) {
if (t.life <= 0) continue;
t.life -= dt;
if (t.life <= 0) { t.line.visible = false; continue; }
t.line.material.opacity = 0.9 * (t.life / t.max);
}
}
}
