import * as THREE from 'three';
import { WORLD, DISTRICTS, PALETTE, PLACES } from './config.js';
import { S } from './state.js';
import { makeRng, clamp, lerp } from './util.js';
import {
makeFacadeSet, makeRoadTexture, makeSidewalkTexture, makeSandTexture,
makeWaterTexture, makeGrassTexture, makeSignTexture, makeGlowTexture, makeContainerTexture,
} from './textures.js';

const tmpColor = new THREE.Color();
const tmpMatrix = new THREE.Matrix4();
const tmpQuat = new THREE.Quaternion();
const tmpScale = new THREE.Vector3();
const tmpPos = new THREE.Vector3();

export function districtAt(x, z) {
for (const d of DISTRICTS) {
if (x >= d.x0 && x <= d.x1 && z >= d.z0 && z <= d.z1) return d;
}
return DISTRICTS[1];
}

const SKY_KEYS = [
[0.00, 0x0b1026, 0x0b1026, 0.18, 0x9fb4ff, 0.25],
[0.22, 0x0b1026, 0x0b1026, 0.18, 0x9fb4ff, 0.25],
[0.27, 0xff9a5c, 0xd89a7a, 0.55, 0xffc98a, 0.45],
[0.33, 0x87bfe8, 0xa8c8e0, 1.05, 0xfff2d8, 0.75],
[0.50, 0x87bfe8, 0xa8c8e0, 1.25, 0xfff2d8, 0.8],
[0.68, 0x9ec8e8, 0xb8d0e0, 1.0, 0xffe8b8, 0.7],
[0.76, 0xff9a5c, 0xd89a7a, 0.5, 0xffb070, 0.45],
[0.82, 0x1a2340, 0x1a2340, 0.18, 0x9fb4ff, 0.28],
[1.00, 0x0b1026, 0x0b1026, 0.18, 0x9fb4ff, 0.25],
];

function skyAt(t) {
let a = SKY_KEYS[0], b = SKY_KEYS[SKY_KEYS.length - 1];
for (let i = 0; i < SKY_KEYS.length - 1; i += 1) {
if (t >= SKY_KEYS[i][0] && t <= SKY_KEYS[i + 1][0]) { a = SKY_KEYS[i]; b = SKY_KEYS[i + 1]; break; }
}
const f = (t - a[0]) / Math.max(1e-6, b[0] - a[0]);
return {
sky: tmpColor.setHex(a[1]).lerp(new THREE.Color(b[1]), f).clone(),
fog: new THREE.Color(a[2]).lerp(new THREE.Color(b[2]), f),
sun: lerp(a[3], b[3], f),
sunColor: new THREE.Color(a[4]).lerp(new THREE.Color(b[4]), f),
hemi: lerp(a[5], b[5], f),
};
}

export function createCity() {
const scene = S.scene;
const rng = makeRng(20261117);
const animated = { boats: [], beam: null, clouds: [], water: null, lampMats: [], facadeMats: [] };




const ground = new THREE.Mesh(
new THREE.PlaneGeometry(505, WORLD.half * 2),
new THREE.MeshLambertMaterial({ map: makeGrassTexture() }),
);
ground.material.map.repeat.set(40, 40);
ground.rotation.x = -Math.PI / 2;
ground.position.set(27, 0, 0);
ground.receiveShadow = true;
scene.add(ground);

const sand = new THREE.Mesh(
new THREE.PlaneGeometry(10, WORLD.half * 2),
new THREE.MeshLambertMaterial({ map: makeSandTexture() }),
);
sand.material.map.repeat.set(1, 40);
sand.rotation.x = -Math.PI / 2;
sand.position.set(-220.5, 0.05, 0);
sand.receiveShadow = true;
scene.add(sand);

const waterTex = makeWaterTexture();
waterTex.repeat.set(30, 30);
const water = new THREE.Mesh(
new THREE.PlaneGeometry(220, WORLD.half * 2 + 400),
new THREE.MeshPhongMaterial({ map: waterTex, color: 0x2a8fb0, shininess: 120, transparent: true, opacity: 0.92 }),
);
water.rotation.x = -Math.PI / 2;
water.position.set(-335, 0.02, 0);
scene.add(water);
animated.water = waterTex;


const roadTex = makeRoadTexture();
const roadMat = new THREE.MeshLambertMaterial({ map: roadTex });
const walkRibbonMat = new THREE.MeshLambertMaterial({ map: makeSidewalkTexture() });
function ribbon(alongX, r, y, half, mat, uRep, vRep, follow) {
const SEG = 80, pos = [], uv = [], idx = [];
let arc = 0, ps = -240, pc = r;
for (let i = 0; i <= SEG; i += 1) {
const s = -240 + (i / SEG) * 480;
const c = r;
arc += Math.hypot(s - ps, c - pc); ps = s; pc = c;
// Straight grid: the road runs dead straight along its axis, so the
// ribbon's edges are plain axis-aligned offsets of half the width.
if (alongX) pos.push(s, y, c - half, s, y, c + half);
else pos.push(c + half, y, s, c - half, y, s);
const u = follow ? arc / 6 : i / SEG * uRep;
uv.push(u, 0, u, vRep);
if (i < SEG) { let hole = false; if (!alongX && follow) { const mz = s + 3; for (const r2 of WORLD.roads) if (Math.abs(mz - r2) < 10.2) { hole = true; break; } } if (!hole) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); } }
}
const geo = new THREE.BufferGeometry();
geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
geo.setIndex(idx);
geo.computeVertexNormals();
const m = new THREE.Mesh(geo, mat);
m.receiveShadow = true;
return m;
}
for (const r of WORLD.roads) {
scene.add(ribbon(true, r, 0.04, 10, walkRibbonMat, 80, 3.3, true), ribbon(false, r, 0.03, 10, walkRibbonMat, 80, 3.3, true));
scene.add(ribbon(true, r, 0.06, 7, roadMat, 1, 1), ribbon(false, r, 0.07, 7, roadMat, 1, 1));
}

scene.add(ribbon(false, -214, 0.08, 3, new THREE.MeshLambertMaterial({ map: makeSidewalkTexture() }), 1, 1, true));

const dashX = [];
const dashZ = [];
for (const r of WORLD.roads) {
for (let t = -234; t <= 234; t += 6) {
let near = false;
for (const r2 of WORLD.roads) if (Math.abs(t - r2) < 10) { near = true; break; }
if (!near) { dashX.push([t, r]); dashZ.push([r, t]); }
}
}
const dashMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
const dashGeoX = new THREE.BoxGeometry(3, 0.02, 0.45);
const dashMeshX = new THREE.InstancedMesh(dashGeoX, dashMat, dashX.length);
dashX.forEach(([x, z], i) => {
tmpMatrix.compose(tmpPos.set(x, 0.12, z), tmpQuat.identity(), tmpScale.set(1, 1, 1));
dashMeshX.setMatrixAt(i, tmpMatrix);
});
const dashGeoZ = new THREE.BoxGeometry(0.45, 0.02, 3);
const dashMeshZ = new THREE.InstancedMesh(dashGeoZ, dashMat, dashZ.length);
dashZ.forEach(([x, z], i) => {
tmpMatrix.compose(tmpPos.set(x, 0.12, z), tmpQuat.identity(), tmpScale.set(1, 1, 1));
dashMeshZ.setMatrixAt(i, tmpMatrix);
});
scene.add(dashMeshX, dashMeshZ);


const edges = [-240, -217, -203, -157, -143, -97, -83, -37, -23, 23, 37, 83, 97, 143, 157, 203, 217, 240];
const segs = [];
for (let i = 0; i < edges.length - 1; i += 1) {
const a = edges[i], b = edges[i + 1];
if (b - a >= 20) segs.push([a, b]);
}
const walkMat = new THREE.MeshLambertMaterial({ color: 0xb3afa2 });
const facades = makeFacadeSet(1234);
const boxGeo = new THREE.BoxGeometry(1, 1, 1);
const roofGeo = new THREE.BoxGeometry(1, 0.3, 1);
const roofMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
const facadeMeshes = facades.map((f) => {
const m = new THREE.MeshLambertMaterial({ map: f.map, emissiveMap: f.emissive, emissive: 0xffffff, emissiveIntensity: 0 });
animated.facadeMats.push(m);
return m;
});
const placements = facades.map(() => []);
const roofPlacements = [];
const housePlacements = [];
const houseRoofPlacements = [];
const colliders = S.colliders;

const shopSigns = [
['RUSTY ANCHOR', '#7a2e2e', '#ffd98a'], ['TIDEWATER GARAGE', '#2e4a7a', '#ffffff'],
['PIER 9', '#3a3a3a', '#ffd23e'], ['SURF SHOP', '#2e8b8b', '#ffffff'],
['TACO MAR', '#c25a2e', '#fff2d8'], ['PALM MOTEL', '#8a5a9e', '#ffffff'],
['SOLMARINA', '#2e6b8a', '#ffffff'], ['BAIT & TACKLE', '#5a6e2e', '#ffffff'],
];
const signMeshes = [];

for (const [x0, x1] of segs) {
for (const [z0, z1] of segs) {
const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
if (cx < -216) continue;
const d = districtAt(cx, cz);
const w = x1 - x0 - 4, dep = z1 - z0 - 4;

const walk = new THREE.Mesh(new THREE.BoxGeometry(w + 2, 0.3, dep + 2), walkMat);
walk.position.set(cx, 0.15, cz);
walk.receiveShadow = true;
scene.add(walk);
if (d.short === 'LAS PALMAS') {

for (const [hx, hz] of [[cx - w / 4, cz], [cx + w / 4, cz]]) {
const hw = 10 + rng() * 4, hd = 9 + rng() * 3, hh = 4.5 + rng() * 1.5;
housePlacements.push([hx, hh / 2 + 0.3, hz, hw, hh, hd, PALETTE.houseTints[(rng() * PALETTE.houseTints.length) | 0]]);
houseRoofPlacements.push([hx, hh + 0.3, hz, hw + 1.2, 3, hd + 1.2]);
colliders.push({ x0: hx - hw / 2, z0: hz - hd / 2, x1: hx + hw / 2, z1: hz + hd / 2 });
}
continue;
}
if (d.short === 'THE PORT') {

const hw = w - 6, hd = dep - 6, hh = 8 + rng() * 4;
const vi = (rng() * facades.length) | 0;
placements[vi].push([cx, hh / 2 + 0.3, cz, hw, hh, hd, PALETTE.warehouseTints[(rng() * PALETTE.warehouseTints.length) | 0]]);
roofPlacements.push([cx, hh + 0.3, cz, hw + 0.6, 0.3, hd + 0.6]);
colliders.push({ x0: cx - hw / 2, z0: cz - hd / 2, x1: cx + hw / 2, z1: cz + hd / 2 });
continue;
}

const plaza = cx === 0 && cz === 0;
const tall = d.short === 'DOWNTOWN';
const n = tall ? 1 : (rng() < 0.5 ? 2 : 1);
for (let k = 0; k < n; k += 1) {
const bw = n === 1 ? w - 4 : w / 2 - 3;
const bd = dep - 4;
const bx = n === 1 ? cx : cx + (k === 0 ? -w / 4 : w / 4);
const hMin = tall ? 22 : d.short === 'OLD TOWN' ? 9 : 6;
const hMax = tall ? 46 : d.short === 'OLD TOWN' ? 17 : 11;
const hh = hMin + rng() * (hMax - hMin);
const vi = (rng() * facades.length) | 0;
const tint = PALETTE.buildingTints[(rng() * PALETTE.buildingTints.length) | 0];
if (!plaza) {
placements[vi].push([bx, hh / 2 + 0.3, cz, bw, hh, bd, tint]);
roofPlacements.push([bx, hh + 0.3, cz, bw + 0.5, 0.3, bd + 0.5]);
colliders.push({ x0: bx - bw / 2, z0: cz - bd / 2, x1: bx + bw / 2, z1: cz + bd / 2 });
}
if ((d.short === 'OLD TOWN' || d.short === 'MARINA') && rng() < 0.4 && signMeshes.length < 12) {
const s = shopSigns[(rng() * shopSigns.length) | 0];
if (!plaza) {
const sign = new THREE.Mesh(
new THREE.PlaneGeometry(12, 3),
new THREE.MeshBasicMaterial({ map: makeSignTexture(s[0], s[1], s[2]) }),
);
sign.position.set(bx, 4.4, cz + bd / 2 + 0.15);
signMeshes.push(sign);
scene.add(sign);
}
}
}
}
}


for (let v = 0; v < facades.length; v += 1) {
const list = placements[v];
if (!list.length) continue;
const mesh = new THREE.InstancedMesh(boxGeo, facadeMeshes[v], list.length);
list.forEach((p, i) => {
tmpPos.set(p[0], p[1], p[2]);
tmpScale.set(p[3], p[4], p[5]);
tmpMatrix.compose(tmpPos, tmpQuat.identity(), tmpScale);
mesh.setMatrixAt(i, tmpMatrix);
mesh.setColorAt(i, tmpColor.setHex(p[6]));
});
mesh.castShadow = true;
mesh.receiveShadow = true;
scene.add(mesh);
}
const roofMesh = new THREE.InstancedMesh(roofGeo, roofMat, roofPlacements.length);
roofPlacements.forEach((p, i) => {
tmpPos.set(p[0], p[1], p[2]);
tmpScale.set(p[3], 1, p[5]);
tmpMatrix.compose(tmpPos, tmpQuat.identity(), tmpScale);
roofMesh.setMatrixAt(i, tmpMatrix);
roofMesh.setColorAt(i, tmpColor.setHex(PALETTE.roofTints[i % PALETTE.roofTints.length]));
});
scene.add(roofMesh);

const houseMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
const houseMesh = new THREE.InstancedMesh(boxGeo, houseMat, housePlacements.length);
housePlacements.forEach((p, i) => {
tmpPos.set(p[0], p[1], p[2]);
tmpScale.set(p[3], p[4], p[5]);
tmpMatrix.compose(tmpPos, tmpQuat.identity(), tmpScale);
houseMesh.setMatrixAt(i, tmpMatrix);
houseMesh.setColorAt(i, tmpColor.setHex(p[6]));
});
houseMesh.castShadow = true;
scene.add(houseMesh);
const coneGeo = new THREE.ConeGeometry(1, 1, 4);
const roofMat2 = new THREE.MeshLambertMaterial({ color: 0xffffff });
const houseRoof = new THREE.InstancedMesh(coneGeo, roofMat2, houseRoofPlacements.length);
houseRoofPlacements.forEach((p, i) => {
tmpPos.set(p[0], p[1] + 1.5, p[2]);
tmpScale.set(p[3] * 0.72, 3, p[5] * 0.72);
tmpQuat.setFromEuler(new THREE.Euler(0, Math.PI / 4, 0));
tmpMatrix.compose(tmpPos, tmpQuat, tmpScale);
houseRoof.setMatrixAt(i, tmpMatrix);
houseRoof.setColorAt(i, tmpColor.setHex(PALETTE.roofTints[(i + 2) % PALETTE.roofTints.length]));
});
scene.add(houseRoof);


const trunkGeo = new THREE.CylinderGeometry(0.35, 0.5, 7, 6);
const trunkMat = new THREE.MeshLambertMaterial({ color: 0x7a5a3a });
const crownGeo = new THREE.IcosahedronGeometry(3.2, 0);
const crownMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
const offRoad = (x, z) => {
for (const r of WORLD.roads) {
if (Math.abs(x - r) < 10) x = x < r ? r - 10 : r + 10;
if (Math.abs(z - r) < 10) z = z < r ? r - 10 : r + 10;
}
return [x, z];
};
const palmSpots = [];
for (let z = -220; z <= 220; z += 30) {
palmSpots.push([-221, z + (rng() * 4 - 2)]);
if (rng() < 0.7) palmSpots.push(offRoad(-196, z + 15));
}
for (let i = 0; i < 40; i += 1) {
const x = 100 + rng() * 130, z = -100 + rng() * 200;
palmSpots.push(offRoad(x, z));
}
for (let i = 0; i < 14; i += 1) {
const p = offRoad(-40 + rng() * 80, -40 + rng() * 80);
if (Math.abs(p[0]) < 9 && Math.abs(p[1]) < 9) p[0] = p[0] < 0 ? -9 : 9;
palmSpots.push(p);
}
const drng = makeRng(987654);
const extraSpots = [];
for (const r of WORLD.roads) {
for (let t = -180; t <= 180; t += 60) {
for (const s of [-1, 1]) {
if (drng() < 0.45) extraSpots.push([r + 10 * s, t]);
if (drng() < 0.45) extraSpots.push([t, r + 10 * s]);
}
}
}
for (let k = 0; k < 8; k += 1) {
const a = k * Math.PI / 4 + 0.4;
extraSpots.push([Math.cos(a) * 15, Math.sin(a) * 15]);
}
const allSpots = palmSpots.concat(extraSpots);
const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, allSpots.length);
const crowns = new THREE.InstancedMesh(crownGeo, crownMat, allSpots.length);
const greens = [0x3e8e4e, 0x4aa85c, 0x2e7a3e, 0x5ab86a];
allSpots.forEach(([x, z], i) => {
const old = i < palmSpots.length;
const lean = (old ? rng() : drng()) * 0.12;
tmpQuat.setFromEuler(new THREE.Euler(lean, (old ? rng() : drng()) * Math.PI, lean * 0.5));
tmpPos.set(x, 3.5, z); tmpScale.set(1, 1, 1);
tmpMatrix.compose(tmpPos, tmpQuat, tmpScale);
trunks.setMatrixAt(i, tmpMatrix);
tmpPos.set(x, 7.6, z); tmpScale.set(1, 0.55, 1);
tmpMatrix.compose(tmpPos, tmpQuat.identity(), tmpScale);
crowns.setMatrixAt(i, tmpMatrix);
crowns.setColorAt(i, tmpColor.setHex(greens[i % greens.length]));
});
trunks.castShadow = true;
scene.add(trunks, crowns);

const palmTrunkGeo = new THREE.CylinderGeometry(0.22, 0.32, 9, 6);
const palmCrownGeo = new THREE.IcosahedronGeometry(3.6, 0);
const palmCrownMat = new THREE.MeshLambertMaterial({ color: 0x4aa85c });
const palmSpots2 = [];
for (let z = -195; z <= 195; z += 30) palmSpots2.push([-221, z]);
for (const z of [135, 165, 195]) palmSpots2.push([-200, z]);
const palmTrunks = new THREE.InstancedMesh(palmTrunkGeo, trunkMat, palmSpots2.length);
const palmCrowns = new THREE.InstancedMesh(palmCrownGeo, palmCrownMat, palmSpots2.length);
palmSpots2.forEach(([x, z], i) => {
const lean = drng() * 0.1;
tmpQuat.setFromEuler(new THREE.Euler(lean, drng() * Math.PI, 0));
tmpMatrix.compose(tmpPos.set(x, 4.5, z), tmpQuat, tmpScale.set(1, 1, 1));
palmTrunks.setMatrixAt(i, tmpMatrix);
tmpMatrix.compose(tmpPos.set(x, 9.4, z), tmpQuat.identity(), tmpScale.set(1, 0.32, 1));
palmCrowns.setMatrixAt(i, tmpMatrix);
});
scene.add(palmTrunks, palmCrowns);


const lampGeo = new THREE.CylinderGeometry(0.18, 0.24, 6, 6);
const lampMat = new THREE.MeshLambertMaterial({ color: 0x303036 });
const headGeo = new THREE.SphereGeometry(0.42, 8, 6);
const headMat = new THREE.MeshLambertMaterial({ color: 0xfff2cc, emissive: 0xffd98a, emissiveIntensity: 0 });
animated.lampMats.push(headMat);
const lampSpots = [];
for (const r of WORLD.roads) {
for (let t = -210; t <= 210; t += 60) {
lampSpots.push([r + 10.5, t + 30]);
lampSpots.push([t + 30, r - 10.5]);
}
}
const lampMesh = new THREE.InstancedMesh(lampGeo, lampMat, lampSpots.length);
const headMesh = new THREE.InstancedMesh(headGeo, headMat, lampSpots.length);
lampSpots.forEach(([x, z], i) => {
tmpPos.set(x, 3, z); tmpScale.set(1, 1, 1);
tmpMatrix.compose(tmpPos, tmpQuat.identity(), tmpScale);
lampMesh.setMatrixAt(i, tmpMatrix);
tmpPos.set(x, 6.1, z);
tmpMatrix.compose(tmpPos, tmpQuat.identity(), tmpScale);
headMesh.setMatrixAt(i, tmpMatrix);
});
scene.add(lampMesh, headMesh);
S.lampPositions = lampSpots;


const craneMat = new THREE.MeshLambertMaterial({ color: 0xc25a2e });
const darkMat = new THREE.MeshLambertMaterial({ color: 0x3a3a3e });
for (const [cx, cz] of [[-60, 200], [30, 205], [120, 200]]) {
const g = new THREE.Group();
const legGeo = new THREE.BoxGeometry(1.4, 26, 1.4);
for (const [lx, lz] of [[-5, -4], [5, -4], [-5, 4], [5, 4]]) {
const leg = new THREE.Mesh(legGeo, craneMat);
leg.position.set(lx, 13, lz);
g.add(leg);
}
const beam = new THREE.Mesh(new THREE.BoxGeometry(34, 2, 2.4), craneMat);
beam.position.set(2, 27, 0);
g.add(beam);
const cab = new THREE.Mesh(new THREE.BoxGeometry(4, 3.4, 4), darkMat);
cab.position.set(-2, 24.5, 0);
g.add(cab);
const cable = new THREE.Mesh(new THREE.BoxGeometry(0.25, 12, 0.25), darkMat);
cable.position.set(12, 20, 0);
g.add(cable);
const hook = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.6, 2), darkMat);
hook.position.set(12, 13.5, 0);
g.add(hook);
g.position.set(cx, 0, cz);
g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
scene.add(g);
for (const [lx, lz] of [[-5, -4], [5, -4], [-5, 4], [5, 4]]) colliders.push({ x0: cx + lx - 0.8, z0: cz + lz - 0.8, x1: cx + lx + 0.8, z1: cz + lz + 0.8 });
}
const contGeo = new THREE.BoxGeometry(6, 2.6, 2.4);
const contCols = [0xc23b2e, 0x2e6bc2, 0x3aa84e, 0xe8c832, 0x8a8f96];
const contSpots = [];
for (let i = 0; i < 26; i += 1) {
let x = -90 + rng() * 240, z = 150 + rng() * 60;
const ci = (rng() * contCols.length) | 0, stacked = rng() < 0.4 ? 1 : 0;
for (const r of WORLD.roads) {
if (Math.abs(x - r) < 15) x = x < r ? r - 15 : r + 15;
if (Math.abs(z - r) < 15) z = z < r ? r - 15 : r + 15;
}
contSpots.push([x, z, ci, stacked, 1.5]);
}
contSpots.push([-229, -184.5, 1, 0, 2.15], [-223, -184.5, 3, 1, 2.15], [-226, -188.5, 0, 0, 2.15]);
const contMesh = new THREE.InstancedMesh(contGeo, new THREE.MeshLambertMaterial({ color: 0xffffff, map: makeContainerTexture() }), contSpots.length + contSpots.filter((s) => s[3]).length);
let contIdx = 0;
contSpots.forEach(([x, z, ci, stacked, baseY], i) => {
tmpQuat.setFromEuler(new THREE.Euler(0, i < 26 ? (rng() < 0.5 ? 0 : Math.PI / 2) : 0, 0));
tmpPos.set(x, baseY, z);
tmpScale.set(1, 1, 1);
tmpMatrix.compose(tmpPos, tmpQuat, tmpScale);
contMesh.setMatrixAt(contIdx, tmpMatrix);
contMesh.setColorAt(contIdx, tmpColor.setHex(contCols[ci]));
contIdx += 1;
if (stacked) {
tmpPos.set(x, baseY + 2.6, z);
tmpMatrix.compose(tmpPos, tmpQuat, tmpScale);
contMesh.setMatrixAt(contIdx, tmpMatrix);
contMesh.setColorAt(contIdx, tmpColor.setHex(contCols[(ci + 1) % contCols.length]));
contIdx += 1;
}
colliders.push({ x0: x - 3.2, z0: z - 2.6, x1: x + 3.2, z1: z + 2.6 });
});
contMesh.castShadow = true;
scene.add(contMesh);


const plankMat = new THREE.MeshLambertMaterial({ color: 0x8a6a4a });
for (const dz of [-120, -186]) {
const dock = new THREE.Mesh(new THREE.BoxGeometry(18, 0.5, 8), plankMat);
dock.position.set(-226, 0.6, dz);
dock.receiveShadow = true;
scene.add(dock);
const posts = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.3, 0.3, 2.4, 6), darkMat, 4);
[[-232, dz - 3.4], [-232, dz + 3.4], [-220, dz - 3.4], [-220, dz + 3.4]].forEach(([x, z], i) => {
tmpPos.set(x, 0.2, z);
tmpMatrix.compose(tmpPos, tmpQuat.identity(), tmpScale.set(1, 1, 1));
posts.setMatrixAt(i, tmpMatrix);
});
scene.add(posts);
}
const boatCols = [0xe8e8e8, 0xc23b2e, 0x2e6bc2, 0xe8c832];
for (let i = 0; i < 4; i += 1) {
const boat = new THREE.Group();
const hull = new THREE.Mesh(new THREE.BoxGeometry(7, 1.6, 2.6), new THREE.MeshLambertMaterial({ color: boatCols[i] }));
hull.position.y = 0.4;
const bow = new THREE.Mesh(new THREE.ConeGeometry(1.3, 2.4, 4), hull.material);
bow.rotation.set(0, Math.PI / 4, -Math.PI / 2);
bow.position.set(4.4, 0.4, 0);
const cab = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.6, 2), new THREE.MeshLambertMaterial({ color: 0x223344 }));
cab.position.set(-0.6, 1.8, 0);
boat.add(hull, bow, cab);
boat.position.set(-234 + rng() * 6, 0, -160 + i * 26);
boat.rotation.y = (rng() - 0.5) * 0.4;
scene.add(boat);
animated.boats.push({ g: boat, phase: rng() * 6.28, y: 0 });
}


const lh = new THREE.Group();
const tower = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 3, 22, 10), new THREE.MeshLambertMaterial({ color: 0xf0e8d8 }));
tower.position.y = 11;
tower.castShadow = true;
const band = new THREE.Mesh(new THREE.CylinderGeometry(2.35, 2.5, 3, 10), new THREE.MeshLambertMaterial({ color: 0xc23b2e }));
band.position.y = 16;
const lampRoom = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 3, 8),
new THREE.MeshLambertMaterial({ color: 0xfff2cc, emissive: 0xffe89a, emissiveIntensity: 0.6 }));
lampRoom.position.y = 23.2;
const beamGeo = new THREE.ConeGeometry(3.2, 60, 12, 1, true);
const beamMat = new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false });
const beam = new THREE.Mesh(beamGeo, beamMat);
beam.rotation.z = Math.PI / 2 - 0.08;
beam.position.set(30, 23.2, 0);
const beamPivot = new THREE.Group();
beamPivot.position.y = 0;
beamPivot.add(beam);
lh.add(tower, band, lampRoom, beamPivot);
lh.position.set(-221, 0, -204);
scene.add(lh);
animated.beam = beamPivot;
colliders.push({ x0: -224.5, z0: -207.5, x1: -217.5, z1: -200.5 });


const fountain = new THREE.Group();
const basin = new THREE.Mesh(new THREE.CylinderGeometry(6, 6.6, 1.2, 16), new THREE.MeshLambertMaterial({ color: 0xb8b0a0 }));
basin.position.y = 0.6;
const waterDisc = new THREE.Mesh(new THREE.CylinderGeometry(5.4, 5.4, 0.3, 16), new THREE.MeshPhongMaterial({ color: 0x4aa8cc, shininess: 100 }));
waterDisc.position.y = 1.2;
const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 3, 8), basin.material);
spout.position.y = 2.4;
fountain.add(basin, waterDisc, spout);
fountain.position.set(0, 0.3, 0);
scene.add(fountain);
colliders.push({ x0: -7, z0: -7, x1: 7, z1: 7 });


const figGeo = new THREE.BoxGeometry(1, 1, 1);
const figMats = new Map();
const fmat = (c) => { let m = figMats.get(c); if (!m) { m = new THREE.MeshLambertMaterial({ color: c }); figMats.set(c, m); } return m; };
function figure(x, y, z, rotY, shirt, pants, skin, seated, hair) {
const g = new THREE.Group();
const mk = (c, sx, sy, sz, py, pz) => { const m = new THREE.Mesh(figGeo, fmat(c)); m.scale.set(sx, sy, sz); m.position.set(0, py, pz); g.add(m); };
mk(shirt, 0.62, 0.8, 0.36, seated ? 0.95 : 1.15, 0);
mk(skin, 0.4, 0.4, 0.4, seated ? 1.52 : 1.72, 0);
mk(hair, 0.42, 0.16, 0.42, seated ? 1.7 : 1.9, 0);
if (seated) mk(pants, 0.5, 0.28, 0.75, 0.55, 0.2);
else mk(pants, 0.5, 0.75, 0.3, 0.38, 0);
g.position.set(x, y, z);
g.rotation.y = rotY;
scene.add(g);
}

const clearOf = (x, z, m) => {
for (const c of colliders) if (x > c.x0 - m && x < c.x1 + m && z > c.z0 - m && z < c.z1 + m) return false;
for (const r of WORLD.roads) if (Math.abs(x - r) < 8.5 || Math.abs(z - r) < 8.5) return false;
for (const k in PLACES) { const p = PLACES[k]; if (Math.hypot(x - p.x, z - p.z) < 9) return false; }
return true;
};
const cafeSpots = [];
{
const cands = [];
for (const cx of [-180, -120, -60, 0, 60, 120, 180]) for (const cz of [-180, -120, -60, 0, 60, 120, 180]) {
for (const [ox, oz] of [[20, 20], [-20, 20], [20, -20], [-20, -20]]) {
const x = cx + ox, z = cz + oz;
if (x > 4 && x < 44 && z > 140 && z < 164) continue;
if (x > -10 && x < 22 && z > 170 && z < 202) continue;
if (x < -196 && z > -144 && z < -104) continue;
if (clearOf(x, z, 2.2)) cands.push([x, z, cx * 1000 + cz]);
}
}
for (let i = cands.length - 1; i > 0; i -= 1) { const j = (drng() * (i + 1)) | 0; const t = cands[i]; cands[i] = cands[j]; cands[j] = t; }
const usedBlocks = new Set();
for (const c of cands) {
if (cafeSpots.length >= 8) break;
if (!usedBlocks.has(c[2]) && !cafeSpots.some((s) => Math.hypot(c[0] - s[0], c[1] - s[1]) < 40)) { cafeSpots.push(c); usedBlocks.add(c[2]); }
}
}
const cafeCols = [0xe8392e, 0x2e7de8, 0xffd23e, 0x2ec85e, 0xff5a8a, 0x2ed8c8];
const tableTops = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.7, 0.7, 0.08, 10), new THREE.MeshLambertMaterial({ color: 0xffffff }), cafeSpots.length);
const tableLegs = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.07, 0.09, 0.75, 6), fmat(0x4a4a52), cafeSpots.length);
const chairSeats = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 0.08, 0.5), new THREE.MeshLambertMaterial({ color: 0xffffff }), cafeSpots.length * 2);
const chairBacks = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 0.55, 0.08), new THREE.MeshLambertMaterial({ color: 0xffffff }), cafeSpots.length * 2);
const skinTones = [0xe8c39a, 0xc89a6a, 0x8a5a3a, 0xf0d0b0];
const shirtCols = [0xe8392e, 0x2e7de8, 0xffd23e, 0x2ec85e, 0xf2f2f2, 0xff5a8a, 0x8a5ae8];
cafeSpots.forEach(([x, z], i) => {
const a = drng() * Math.PI;
const dx = Math.cos(a), dz = Math.sin(a);
tmpMatrix.compose(tmpPos.set(x, 1.05, z), tmpQuat.identity(), tmpScale.set(1, 1, 1));
tableTops.setMatrixAt(i, tmpMatrix);
tableTops.setColorAt(i, tmpColor.setHex(cafeCols[i % cafeCols.length]));
tmpMatrix.compose(tmpPos.set(x, 0.68, z), tmpQuat.identity(), tmpScale.set(1, 1, 1));
tableLegs.setMatrixAt(i, tmpMatrix);
for (let k = 0; k < 2; k += 1) {
const s = k ? 1 : -1;
const q = tmpQuat.setFromEuler(new THREE.Euler(0, a + (k ? 0 : Math.PI), 0));
tmpMatrix.compose(tmpPos.set(x + dx * 1.2 * s, 0.75, z + dz * 1.2 * s), q, tmpScale.set(1, 1, 1));
chairSeats.setMatrixAt(i * 2 + k, tmpMatrix);
chairSeats.setColorAt(i * 2 + k, tmpColor.setHex(cafeCols[(i + k + 1) % cafeCols.length]));
tmpMatrix.compose(tmpPos.set(x + dx * 1.45 * s, 1.0, z + dz * 1.45 * s), q, tmpScale.set(1, 1, 1));
chairBacks.setMatrixAt(i * 2 + k, tmpMatrix);
chairBacks.setColorAt(i * 2 + k, tmpColor.setHex(cafeCols[(i + k + 1) % cafeCols.length]));
figure(x + dx * 1.2 * s, 0.3, z + dz * 1.2 * s, Math.atan2(-dx * s, -dz * s), shirtCols[(i * 2 + k) % shirtCols.length], 0x2a3a5a, skinTones[(i + k) % skinTones.length], true, 0x2a2a2a);
}
colliders.push({ x0: x - 1.6, z0: z - 1.6, x1: x + 1.6, z1: z + 1.6 });
});
scene.add(tableTops, tableLegs, chairSeats, chairBacks);

const umbZ = [];
for (let i = 0; i < 8; i += 1) umbZ.push(-180 + i * 48 + rng() * 10);
umbZ.push(-204, -156, -96, -12, 28, 84, 132, 180);
const umbCols = [0xe86a8a, 0x2e8b8b, 0xffd23e, 0xff7a2e, 0x8a5ae8];
const umbPoles = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.09, 0.09, 2.6, 5), plankMat, umbZ.length);
const umbTops = new THREE.InstancedMesh(new THREE.ConeGeometry(2, 0.9, 8), new THREE.MeshLambertMaterial({ color: 0xffffff, side: THREE.DoubleSide }), umbZ.length);
umbZ.forEach((z, i) => {
tmpMatrix.compose(tmpPos.set(-220.5, 1.3, z), tmpQuat.identity(), tmpScale.set(1, 1, 1));
umbPoles.setMatrixAt(i, tmpMatrix);
tmpMatrix.compose(tmpPos.set(-220.5, 2.7, z), tmpQuat.identity(), tmpScale.set(1, 1, 1));
umbTops.setMatrixAt(i, tmpMatrix);
umbTops.setColorAt(i, tmpColor.setHex(umbCols[i % umbCols.length]));
});
scene.add(umbPoles, umbTops);
const loungeZ = [-190, -160, -130, -100, -70, -40, -10, 20, 50, 80];
const lounges = new THREE.InstancedMesh(new THREE.BoxGeometry(0.6, 0.25, 1.8), new THREE.MeshLambertMaterial({ color: 0xffffff }), loungeZ.length);
loungeZ.forEach((z, i) => {
tmpQuat.setFromEuler(new THREE.Euler(0, (drng() - 0.5) * 0.6, 0));
tmpMatrix.compose(tmpPos.set(-219, 0.18, z), tmpQuat, tmpScale.set(1, 1, 1));
lounges.setMatrixAt(i, tmpMatrix);
lounges.setColorAt(i, tmpColor.setHex(umbCols[(i + 2) % umbCols.length]));
});
scene.add(lounges);
for (const z of [-150, -90, -20, 70, 110, 175]) {
figure(-220, 0.05, z, drng() * Math.PI * 2, shirtCols[(z + 150) % shirtCols.length], 0x3a6a8a, skinTones[(z + 90) % skinTones.length], false, 0x1a1a1a);
}


colliders.push({ x0: -400, z0: -400, x1: -300, z1: 400 });


const starGeo = new THREE.BufferGeometry();
const starPos = new Float32Array(400 * 3);
for (let i = 0; i < 400; i += 1) {
const a = rng() * Math.PI * 2, e = 0.15 + rng() * 1.3, r = 600;
starPos[i * 3] = Math.cos(a) * Math.cos(e) * r;
starPos[i * 3 + 1] = Math.sin(e) * r;
starPos[i * 3 + 2] = Math.sin(a) * Math.cos(e) * r;
}
starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, transparent: true, opacity: 0, sizeAttenuation: false });
const stars = new THREE.Points(starGeo, starMat);
stars.raycast = () => {};
scene.add(stars);

const glowTex = makeGlowTexture();
for (let i = 0; i < 10; i += 1) {
const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false }));
sp.scale.set(40 + rng() * 40, 10 + rng() * 8, 1);
sp.position.set(-300 + rng() * 600, 90 + rng() * 40, -300 + rng() * 600);
sp.raycast = () => {};
scene.add(sp);
animated.clouds.push(sp);
}

const sun = new THREE.DirectionalLight(0xfff2d8, 1.1);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -70;
sun.shadow.camera.right = 70;
sun.shadow.camera.top = 70;
sun.shadow.camera.bottom = -70;
sun.shadow.camera.near = 10;
sun.shadow.camera.far = 400;
sun.shadow.bias = -0.0005;
scene.add(sun, sun.target);
const hemi = new THREE.HemisphereLight(0xbdd8f0, 0x6a7a5a, 0.75);
scene.add(hemi);
scene.fog = new THREE.Fog(0xa8c8e0, 180, 520);

S.districtAt = districtAt;
S.roadGraph = { roads: WORLD.roads };

let time = 0;
return {
update(dt) {
time += dt;
const t = S.dayTime;
const sky = skyAt(t);
scene.background = sky.sky;
scene.fog.color.copy(sky.fog);
sun.intensity = sky.sun;
sun.color.copy(sky.sunColor);
hemi.intensity = sky.hemi;

const ang = (t - 0.25) * Math.PI * 2;
const elev = Math.sin(ang);
const px = S.player ? S.player.pos.x : 0;
const pz = S.player ? S.player.pos.z : 0;
const dir = new THREE.Vector3(Math.cos(ang), Math.max(0.12, Math.abs(elev)) * (elev >= 0 ? 1 : 0.4), 0.35);
sun.position.set(px + dir.x * 160, 60 + Math.abs(elev) * 120, pz + dir.z * 160);
sun.target.position.set(px, 0, pz);
const night = clamp(1 - sky.sun / 0.6, 0, 1);
starMat.opacity = night * 0.9;
for (const m of animated.facadeMats) m.emissiveIntensity = night * 0.9;
for (const m of animated.lampMats) m.emissiveIntensity = night * 1.6;
for (const c of animated.clouds) {
c.material.opacity = 0.55 - night * 0.4;
c.position.x += dt * 1.2;
if (c.position.x > 320) c.position.x = -320;
}
if (animated.water) {
animated.water.offset.x += dt * 0.008;
animated.water.offset.y += dt * 0.005;
}
for (const b of animated.boats) {
b.g.position.y = Math.sin(time * 0.7 + b.phase) * 0.18;
b.g.rotation.z = Math.sin(time * 0.5 + b.phase) * 0.03;
}
if (animated.beam) animated.beam.rotation.y += dt * 0.35;
},
};
}
