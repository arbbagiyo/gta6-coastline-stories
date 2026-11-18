export const WORLD = {
half: 240,
roadGap: 60,
roadWidth: 14,
roads: [-210, -150, -90, -30, 30, 90, 150, 210],
oceanEdge: -217,
beachEdge: -203,
dayLength: 360,
startTime: 0.4,
};

export const DISTRICTS = [
{ name: 'Harborlight Marina', short: 'MARINA', x0: -240, z0: -240, x1: -120, z1: 90, color: 0x2e8b8b, map: '#2e8b8b' },
{ name: 'Old Town', short: 'OLD TOWN', x0: -120, z0: -120, x1: 90, z1: 90, color: 0xd9a441, map: '#c98f2e' },
{ name: 'Downtown Solmarina', short: 'DOWNTOWN', x0: -120, z0: -240, x1: 120, z1: -120, color: 0x5b7fa6, map: '#5b7fa6' },
{ name: 'Las Palmas', short: 'LAS PALMAS', x0: 90, z0: -120, x1: 240, z1: 120, color: 0x7aa95c, map: '#7aa95c' },
{ name: 'Port Industrial', short: 'THE PORT', x0: -120, z0: 120, x1: 240, z1: 240, color: 0x8a7a66, map: '#8a7a66' },
{ name: 'South Beach', short: 'SOUTH BEACH', x0: -240, z0: 90, x1: -120, z1: 240, color: 0xd9c489, map: '#d9c489' },
];

export const PLACES = {
rustyAnchor: { name: 'The Rusty Anchor', x: -186, z: -156, blurb: 'Rosa\u2019s marina bar' },
theoGarage: { name: 'Tidewater Garage', x: -36, z: 36, blurb: 'Theo\u2019s workshop' },
portWarehouse: { name: 'Pier 9 Warehouse', x: 6, z: 204, blurb: 'Vince\u2019s lockup' },
safehouse: { name: 'Lena\u2019s Safehouse', x: 156, z: 96, blurb: 'Las Palmas' },
policeStation: { name: 'Solmarina PD', x: 36, z: -156, blurb: 'Downtown' },
hospital: { name: 'St. Marisol Hospital', x: 96, z: -36, blurb: 'Downtown' },
marinaDock: { name: 'Harborlight Dock', x: -228, z: -120, blurb: 'Boat slip 4' },
plaza: { name: 'Plaza del Sol', x: 0, z: 0, blurb: 'Old Town' },
lighthouse: { name: 'Harborlight Point', x: -228, z: -204, blurb: 'The old light' },
courierDepot: { name: 'Coast Courier Depot', x: 186, z: -186, blurb: 'North-east yard' },
};

export const CHARACTERS = {
lena: { name: 'Lena Maris', color: '#7fd4c1', desc: 'Ex-courier, new in trouble' },
theo: { name: 'Theo "Tide" Okafor', color: '#f2b04e', desc: 'Mechanic, old friend' },
rosa: { name: 'Rosa Delgado', color: '#e86a8a', desc: 'Runs the Rusty Anchor' },
vince: { name: 'Vince Kroll', color: '#b08ae8', desc: 'Smuggler with a ledger' },
ana: { name: 'Det. Ana Park', color: '#6aa8e8', desc: 'Solmarina PD, honest cop' },
marco: { name: 'Marco Venn', color: '#e86a5a', desc: 'Rival crew lieutenant' },
};

export const PALETTE = {
skyDay: 0x87bfe8,
skyDusk: 0xff9a5c,
skyNight: 0x0b1026,
fogDay: 0xa8c8e0,
sun: 0xfff2d8,
moon: 0x9fb4ff,
ground: 0x9aa78f,
sand: 0xe0d199,
water: 0x1d6f8e,
asphalt: 0x3a3d42,
sidewalk: 0xb8b4a8,
buildingTints: [0xf8f0e4, 0xf0ece2, 0xf6ead8, 0xeef0ea, 0xf8e8dc, 0xeceef2, 0xf4ecdd, 0xf0e8e0],
houseTints: [0xffe8c8, 0xffd0c0, 0xd0f0e0, 0xfff0b8, 0xe0d8ff, 0xffe8e0],
warehouseTints: [0xc8b8a8, 0xb8a898, 0xd0c0a8, 0xa8b0b8],
roofTints: [0xc26a4a, 0x8a5a4a, 0x4a6a7a, 0x7a8a9a, 0xb85a3a, 0x3e7a6a],
carPaints: [0xe8392e, 0x2e7de8, 0xffd23e, 0x2ec85e, 0xf2f2f2, 0x3a3a42, 0xff5a8a, 0xff7a2e, 0x8a5ae8, 0x2ed8c8],
};

export const TUNE = {
walkSpeed: 5.2,
sprintSpeed: 8.6,
jumpVel: 8.2,
gravity: 22,
playerHealth: 100,
maxHealth: 100,
magSize: 12,
carEnterRange: 4.2,
interactRange: 4.5,
trafficCount: 22,
parkedCount: 26,
pedCount: 42,
policeMax: 6,
wantedDecayHidden: 9,
bustRange: 3.2,
bustTime: 1.6,
missionReward: [400, 650, 900, 1200, 2500],
courierPay: 150,
shellCount: 10,
shellPay: 100,
};

export const RADIO = [
{ name: 'TIDE FM 88.5', style: 'Sunset synth', bpm: 112, root: 220, mode: 'minor' },
{ name: 'PALM RADIO 94.1', style: 'Coast reggae', bpm: 76, root: 196, mode: 'major' },
{ name: 'NIGHT DRIVE 101.7', style: 'Night pulse', bpm: 128, root: 165, mode: 'minor' },
];
