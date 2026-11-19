import { S } from './state.js';

const KEY = 'coastline-stories-save-v1';

export function saveGame() {
try {
const data = {
version: 1,
savedAt: Date.now(),
missionIndex: S.missionIndex,
cash: S.cash,
shellsFound: S.shellsFound,
shellsTaken: S.shells.filter((s) => s.taken).map((s) => `${s.x},${s.z}`),
stats: { ...S.stats },
settings: { ...S.settings },
dayTime: S.dayTime,
health: S.health,
armor: S.armor,
respect: S.respect,
smgAmmo: S.smgAmmo,
garage: S.garage ? { type: S.garage.type, color: S.garage.color, engine: S.garage.engine || 0, armor: S.garage.armor || 0, nitro: S.garage.nitro || 0, health: S.garage.health || 100 } : null,
player: S.player ? { x: S.player.pos.x, z: S.player.pos.z, heading: S.player.heading } : null,
};
window.localStorage.setItem(KEY, JSON.stringify(data));
return true;
} catch {
return false;
}
}

export function loadGame() {
try {
const raw = window.localStorage.getItem(KEY);
if (!raw) return null;
const data = JSON.parse(raw);
if (!data || data.version !== 1 || typeof data.missionIndex !== 'number') return null;
return data;
} catch {
return null;
}
}

export function hasSave() {
return loadGame() !== null;
}

export function applySave(data, restoreShells) {
S.missionIndex = data.missionIndex;
S.cash = data.cash;
S.shellsFound = data.shellsFound || 0;
Object.assign(S.stats, data.stats || {});
Object.assign(S.settings, data.settings || {});
if (typeof data.dayTime === 'number') S.dayTime = data.dayTime;
if (typeof data.health === 'number') S.health = data.health;
if (typeof data.armor === 'number') S.armor = data.armor;
if (typeof data.respect === 'number') S.respect = data.respect;
if (typeof data.smgAmmo === 'number') S.smgAmmo = data.smgAmmo;
if (data.garage && typeof data.garage.type === 'string') S.garage = { type: data.garage.type, color: data.garage.color, engine: data.garage.engine || 0, armor: data.garage.armor || 0, nitro: data.garage.nitro || 0, health: data.garage.health || 100 };
if (data.shellsTaken && restoreShells) restoreShells(data.shellsTaken.length);
if (data.player && S.player) {
S.player.pos.set(data.player.x, 0.3, data.player.z);
S.player.heading = data.player.heading || 0;
}
}

export function clearSave() {
try {
window.localStorage.removeItem(KEY);
} catch {

}
}
