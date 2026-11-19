import { PLACES, GARAGE_UPGRADES } from './config.js';
import { S, addRespect } from './state.js';
import { dist2D } from './util.js';
import { createCar } from './vehicles.js';

const $ = (id) => document.getElementById(id);

let open = false;

export const isGarageOpen = () => open;

export function garageNearby() {
if (!S.player) return false;
return dist2D(S.player.pos.x, S.player.pos.z, PLACES.theoGarage.x, PLACES.theoGarage.z) < 7;
}

export function applyUpgradesToCar(car) {
if (!car) return;
const u = car.upg || { engine: 0, armor: 0, nitro: 0 };
car.upg = u;
car.topMul = 1 + 0.12 * u.engine;
car.maxHealth = 100 + 50 * u.armor;
if (car.health > car.maxHealth) car.health = car.maxHealth;
}

export function storeCurrentCar() {
const car = S.driving;
if (!car) { S.hud?.toast('Get in a car first, then bring it to the garage.'); return false; }
if (car.type === 'boat') { S.hud?.toast('The garage does not take boats.'); return false; }
if (car.driver !== 'player') return false;
const had = S.garage;
S.garage = {
type: car.type, color: car.color,
engine: car.upg?.engine || 0, armor: car.upg?.armor || 0, nitro: car.upg?.nitro || 0,
health: Math.max(1, Math.round(car.health)),
};
S.scene.remove(car.mesh);
S.driving = null;
S.player.rig.group.visible = true;
S.player.pos.set(PLACES.theoGarage.x + 4, 0.3, PLACES.theoGarage.z);
S.player.heading = Math.PI / 2;
S.audio?.carDoor();
S.hud?.toast(had ? 'Stored — your old garage car was traded in.' : 'Stored at Tidewater Garage. She is yours now.');
S.save?.();
return true;
}

export function takeCarOut() {
if (!S.garage) { S.hud?.toast('No car stored yet — jack one and bring it here.'); return false; }
const g = S.garage;
const car = createCar(g.type, PLACES.theoGarage.x + 8, PLACES.theoGarage.z, Math.PI / 2, g.color, 'parked');
car.upg = { engine: g.engine, armor: g.armor, nitro: g.nitro };
car.health = g.health;
applyUpgradesToCar(car);
S.parked.push(car);
S.garage = null;
S.hud?.toast('Your ride is parked outside the garage.');
S.audio?.carDoor();
renderGarage();
return true;
}

export function buyUpgrade(key) {
const up = GARAGE_UPGRADES[key];
if (!up || !S.garage) return;
const lvl = S.garage[key] || 0;
if (lvl >= up.max) { S.hud?.toast(`${up.name} is already maxed out.`); return; }
const cost = up.costs[lvl];
if (S.cash < cost) { S.hud?.toast(`Not enough cash — ${up.name} Lv ${lvl + 1} costs $${cost}.`); S.audio?.click(); return; }
S.cash -= cost;
S.garage[key] = lvl + 1;
S.audio?.pickup();
S.hud?.toast(`${up.name} upgraded to Lv ${lvl + 1}!`);
S.save?.();
renderGarage();
}

export function spawnGarageCar() {
if (!S.garage) return null;
const g = S.garage;
const car = createCar(g.type, PLACES.theoGarage.x + 8, PLACES.theoGarage.z, Math.PI / 2, g.color, 'parked');
car.upg = { engine: g.engine, armor: g.armor, nitro: g.nitro };
car.health = g.health;
applyUpgradesToCar(car);
S.parked.push(car);
S.garage = null;
return car;
}

function renderGarage() {
const g = S.garage;
$('garage-car').innerHTML = g
? `<b>${g.type.toUpperCase()}</b> · Engine Lv ${g.engine}/3 · Armor Lv ${g.armor}/3 · Nitro Lv ${g.nitro}/2 · Cash ${'$' + Math.round(S.cash)}`
: `No car stored yet — jack a car on the street, drive it here, and press E. Cash ${'$' + Math.round(S.cash)}`;
$('garage-upgrades').innerHTML = Object.entries(GARAGE_UPGRADES).map(([key, up]) => {
const lvl = g ? (g[key] || 0) : 0;
const maxed = lvl >= up.max;
const cost = maxed ? null : up.costs[lvl];
const pips = '●'.repeat(lvl) + '○'.repeat(up.max - lvl);
return `<div class="gu-row"><div><b>${up.name}</b> ${pips}<br><span class="gu-desc">${up.desc}</span></div><button class="btn gu-buy" data-up="${key}" ${!g || maxed ? 'disabled' : ''}>${maxed ? 'MAX' : 'Buy $' + cost}</button></div>`;
}).join('');
for (const b of document.querySelectorAll('.gu-buy')) {
b.addEventListener('click', () => buyUpgrade(b.dataset.up));
}
$('btn-garage-store').disabled = !S.driving;
$('btn-garage-take').disabled = !g;
}

export function openGarage() {
if (open) return;
open = true;
renderGarage();
$('garage-panel').classList.remove('hidden');
document.exitPointerLock?.();
}

export function closeGarage() {
if (!open) return;
open = false;
$('garage-panel').classList.add('hidden');
}

export function initGarage() {
$('btn-garage-close').addEventListener('click', () => closeGarage());
$('btn-garage-store').addEventListener('click', () => { if (storeCurrentCar()) renderGarage(); });
$('btn-garage-take').addEventListener('click', () => takeCarOut());
}
