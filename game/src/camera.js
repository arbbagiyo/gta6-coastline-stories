import * as THREE from 'three';
import { S } from './state.js';
import { clamp, damp, dampAngle, segmentHitsBox } from './util.js';
import { input } from './input.js';

const camState = {
yaw: Math.PI * 0.75,
pitch: 0.32,
dist: 8,
pos: new THREE.Vector3(0, 6, 12),
look: new THREE.Vector3(),
trauma: 0,
};

export function resetCamera(yaw, pitch) {
camState.yaw = yaw;
camState.pitch = pitch;
camState.trauma = 0;
}

export function addShake(amount) {
camState.trauma = clamp(camState.trauma + amount, 0, 1);
}

export function updateCamera(dt) {
const sens = 0.0026 * S.settings.sensitivity;
camState.yaw -= input.mouseDX * sens;
camState.pitch = clamp(camState.pitch + input.mouseDY * sens, 0.06, 1.15);

const driving = !!S.driving;
const focus = driving ? S.driving.pos : S.player.pos;
const heading = driving ? S.driving.heading : S.player.heading;
const speed = driving ? Math.abs(S.driving.speed) : S.player.moveSpeed;




if (Math.abs(input.mouseDX) < 0.5 && speed > 3) {
const behind = Math.PI - heading;
camState.yaw = dampAngle(camState.yaw, behind, driving ? 1.4 : 0.9, dt);
}

const wantDist = driving ? 10 + clamp(speed * 0.14, 0, 4) : 7.2;
camState.dist = damp(camState.dist, wantDist, 3, dt);

const headH = driving ? 2.2 : 1.9;
const lookX = focus.x, lookY = focus.y + headH, lookZ = focus.z;
let dist = camState.dist;

for (let tries = 0; tries < 3; tries += 1) {
const cx = lookX + Math.cos(camState.yaw) * Math.cos(camState.pitch) * dist;
const cz = lookZ + Math.sin(camState.yaw) * Math.cos(camState.pitch) * dist;
let blocked = false;
for (const b of S.colliders) {
if (segmentHitsBox(lookX, lookZ, cx, cz, b)) { blocked = true; break; }
}
if (!blocked) break;
dist *= 0.6;
if (dist < 2.5) { dist = 2.5; break; }
}
const camX = lookX + Math.cos(camState.yaw) * Math.cos(camState.pitch) * dist;
const camZ = lookZ + Math.sin(camState.yaw) * Math.cos(camState.pitch) * dist;
const camY = Math.max(1.3, lookY + Math.sin(camState.pitch) * dist);

camState.trauma = Math.max(0, camState.trauma - dt * 1.6);
const sh = camState.trauma * camState.trauma * 0.7;
const shX = (Math.random() - 0.5) * sh;
const shY = (Math.random() - 0.5) * sh;

camState.pos.x = damp(camState.pos.x, camX, 14, dt);
camState.pos.y = damp(camState.pos.y, camY, 14, dt);
camState.pos.z = damp(camState.pos.z, camZ, 14, dt);
camState.look.set(lookX, lookY, lookZ);
S.camera.position.set(camState.pos.x + shX, camState.pos.y + shY, camState.pos.z);
S.camera.lookAt(camState.look);
}

export function cameraForward() {
const f = new THREE.Vector3();
S.camera.getWorldDirection(f);
f.y = 0;
return f.normalize();
}
