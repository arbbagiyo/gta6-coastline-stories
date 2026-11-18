export const S = {

scene: null,
camera: null,
renderer: null,
clock: null,


colliders: [],
roadGraph: null,
spawnPoints: [],
lampPositions: [],
districtAt: null,


dayTime: 0.4,
paused: false,
screen: 'title',


player: null,
driving: null,
health: 100,
armor: 0,
cash: 250,
weapon: 'pistol',
ammo: 12,
playerFiredTimer: 0,
godTimer: 0,


wanted: 0,
wantedTimer: 0,
hiddenTimer: 0,
police: [],
bustTimer: 0,


traffic: [],
parked: [],
peds: [],
rivals: [],


missionIndex: 0,
mission: null,
missionRetry: null,
courier: null,
shellsFound: 0,
shells: [],
nearMissionStart: false,
nearPickup: false,
nearCourier: false,


stats: {
missionsDone: 0,
carsStolen: 0,
distanceDriven: 0,
distanceWalked: 0,
shotsFired: 0,
shotsHit: 0,
rivalsDown: 0,
escapes: 0,
jobsDone: 0,
couriersDone: 0,
playSeconds: 0,
maxWanted: 0,
},


settings: { volume: 0.7, muted: false, radio: 0, quality: 'high', sensitivity: 1.0 },


dialogue: null,
banner: null,
prompt: null,
message: null,
objective: null,
marker: null,
damageFlash: 0,
shake: 0,
radioOn: true,
shotMode: null,


audio: null,
hud: null,
effects: null,
missions: null,
policeSys: null,
saveSys: null,


playerDamage: null,
onInteract: null,
onWasted: null,
onBusted: null,
save: null,
};

export function resetRunState() {


S.health = 100;
S.armor = 0;
S.cash = 250;
S.ammo = 12;
S.wanted = 0;
S.wantedTimer = 0;
S.hiddenTimer = 0;
S.bustTimer = 0;
S.playerFiredTimer = 0;
S.godTimer = 0;
S.missionIndex = 0;
S.mission = null;
S.missionRetry = null;
S.courier = null;
S.shellsFound = 0;
S.dayTime = 0.4;
S.dialogue = null;
S.banner = null;
S.marker = null;
S.driving = null;
S.stats = {
missionsDone: 0,
carsStolen: 0,
distanceDriven: 0,
distanceWalked: 0,
shotsFired: 0,
shotsHit: 0,
rivalsDown: 0,
escapes: 0,
jobsDone: 0,
couriersDone: 0,
playSeconds: 0,
maxWanted: 0,
};
}
