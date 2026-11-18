import { RADIO } from './config.js';
import { S } from './state.js';
import { clamp } from './util.js';

const midi = (m) => 440 * 2 ** ((m - 69) / 12);

const STATIONS = [
{
...RADIO[0],
bpm: 92, wave: 'sine',
bass: [45, 0, 45, 0, 48, 0, 43, 0, 45, 0, 45, 0, 50, 0, 48, 0],
lead: [69, 0, 0, 72, 0, 0, 71, 0, 69, 0, 67, 0, 0, 64, 0, 0],
kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
},
{
...RADIO[1],
bpm: 112, wave: 'square',
bass: [41, 41, 0, 41, 0, 44, 0, 41, 46, 0, 44, 0, 41, 0, 39, 0],
lead: [0, 65, 0, 0, 68, 0, 65, 0, 0, 70, 0, 68, 0, 0, 65, 0],
kick: [1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0],
},
{
...RADIO[2],
bpm: 100, wave: 'sawtooth',
bass: [38, 0, 38, 0, 38, 0, 41, 0, 38, 0, 38, 0, 43, 0, 41, 0],
lead: [62, 65, 69, 65, 62, 65, 69, 72, 70, 69, 65, 62, 60, 62, 65, 0],
kick: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
},
];

export class AudioEngine {
constructor() {
this.ctx = null;
this.master = null;
this.sfxGain = null;
this.musicGain = null;
this.muted = false;
this.station = 0;
this.seqTimer = null;
this.seqStep = 0;
this.nextTime = 0;
this.engineNodes = null;
this.sirenNodes = null;
this.sirenGain = null;
this.noiseBuf = null;
}

init() {
if (this.ctx) {
if (this.ctx.state === 'suspended') this.ctx.resume();
return;
}
const AC = window.AudioContext || window.webkitAudioContext;
if (!AC) return;
this.ctx = new AC();
this.master = this.ctx.createGain();
this.master.gain.value = 0.8;
this.master.connect(this.ctx.destination);
this.sfxGain = this.ctx.createGain();
this.sfxGain.gain.value = 0.9;
this.sfxGain.connect(this.master);
this.musicGain = this.ctx.createGain();
this.musicGain.gain.value = 0.34;
this.musicGain.connect(this.master);

const len = this.ctx.sampleRate * 1;
this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
const data = this.noiseBuf.getChannelData(0);
for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
this.startSequencer();
this.startEngineLoop();
this.startSirenLoop();
}

setMuted(m) {
this.muted = m;
if (this.master) this.master.gain.value = m ? 0 : 0.8;
}

toggleMute() {
this.setMuted(!this.muted);
return this.muted;
}


tone(freq, dur, { type = 'sine', gain = 0.3, when = 0, slideTo = null, dest = null } = {}) {
if (!this.ctx) return;
const t = this.ctx.currentTime + when;
const o = this.ctx.createOscillator();
const g = this.ctx.createGain();
o.type = type;
o.frequency.setValueAtTime(freq, t);
if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
g.gain.setValueAtTime(gain, t);
g.gain.exponentialRampToValueAtTime(0.001, t + dur);
o.connect(g).connect(dest || this.sfxGain);
o.start(t);
o.stop(t + dur + 0.05);
}

noise(dur, { gain = 0.4, when = 0, filterFreq = 1200, q = 0.8, type = 'lowpass', dest = null } = {}) {
if (!this.ctx) return;
const t = this.ctx.currentTime + when;
const src = this.ctx.createBufferSource();
src.buffer = this.noiseBuf;
src.loop = true;
const f = this.ctx.createBiquadFilter();
f.type = type;
f.frequency.value = filterFreq;
f.Q.value = q;
const g = this.ctx.createGain();
g.gain.setValueAtTime(gain, t);
g.gain.exponentialRampToValueAtTime(0.001, t + dur);
src.connect(f).connect(g).connect(dest || this.sfxGain);
src.start(t);
src.stop(t + dur + 0.05);
}


shot(distance, isPlayer) {
const vol = isPlayer ? 0.5 : clamp(0.45 - distance * 0.008, 0.03, 0.45);
this.noise(0.14, { gain: vol, filterFreq: 2600, type: 'bandpass', q: 0.6 });
this.tone(160, 0.1, { type: 'square', gain: vol * 0.5, slideTo: 50 });
}

thud(strength) {
this.noise(0.18, { gain: clamp(strength * 0.04, 0.1, 0.6), filterFreq: 300 });
this.tone(70, 0.16, { gain: 0.4, slideTo: 35 });
}

explosion(distance) {
const vol = clamp(0.8 - distance * 0.006, 0.1, 0.8);
this.noise(0.9, { gain: vol, filterFreq: 500 });
this.tone(55, 0.8, { gain: vol * 0.7, slideTo: 28 });
}

horn() {
this.tone(370, 0.35, { type: 'square', gain: 0.16 });
this.tone(466, 0.35, { type: 'square', gain: 0.16 });
}

carDoor() {
this.noise(0.09, { gain: 0.35, filterFreq: 500 });
this.tone(95, 0.1, { gain: 0.3, slideTo: 60 });
}

click() { this.tone(1200, 0.05, { type: 'square', gain: 0.12 }); }

reload() {
this.click();
this.noise(0.06, { gain: 0.2, filterFreq: 3000, type: 'highpass', when: 0.25 });
this.click();
}

jump() { this.tone(300, 0.12, { gain: 0.12, slideTo: 420 }); }

hurt() {
this.tone(110, 0.18, { type: 'sawtooth', gain: 0.25, slideTo: 70 });
}

pickup() {
this.tone(660, 0.1, { gain: 0.22 });
this.tone(880, 0.12, { gain: 0.22, when: 0.09 });
this.tone(1320, 0.16, { gain: 0.2, when: 0.18 });
}

alert() {
this.tone(520, 0.14, { type: 'square', gain: 0.2 });
this.tone(392, 0.2, { type: 'square', gain: 0.2, when: 0.15 });
}

missionStart() {
[523, 659, 784].forEach((f, i) => this.tone(f, 0.18, { gain: 0.22, when: i * 0.11 }));
}

missionPass() {
[523, 659, 784, 1047, 784, 1047].forEach((f, i) => this.tone(f, 0.22, { gain: 0.24, when: i * 0.12 }));
}

missionFail() {
[392, 330, 262, 196].forEach((f, i) => this.tone(f, 0.3, { type: 'triangle', gain: 0.25, when: i * 0.18 }));
}


startEngineLoop() {
const ctx = this.ctx;
const o1 = ctx.createOscillator();
const o2 = ctx.createOscillator();
o1.type = 'sawtooth';
o2.type = 'sawtooth';
o1.frequency.value = 55;
o2.frequency.value = 58;
const f = ctx.createBiquadFilter();
f.type = 'lowpass';
f.frequency.value = 400;
const g = ctx.createGain();
g.gain.value = 0;
o1.connect(f);
o2.connect(f);
f.connect(g).connect(this.sfxGain);
o1.start();
o2.start();
this.engineNodes = { o1, o2, f, g };
}

engineOn() {
if (this.engineNodes) this.engineNodes.g.gain.setTargetAtTime(0.1, this.ctx.currentTime, 0.1);
}

setEngine(ratio, driving) {
if (!this.engineNodes || !this.ctx) return;
const t = this.ctx.currentTime;
const freq = 50 + ratio * 130;
this.engineNodes.o1.frequency.setTargetAtTime(freq, t, 0.08);
this.engineNodes.o2.frequency.setTargetAtTime(freq * 1.06 + 2, t, 0.08);
this.engineNodes.f.frequency.setTargetAtTime(300 + ratio * 900, t, 0.1);
this.engineNodes.g.gain.setTargetAtTime(driving ? 0.06 + ratio * 0.1 : 0, t, 0.15);
}


startSirenLoop() {
const ctx = this.ctx;
const o = ctx.createOscillator();
o.type = 'triangle';
o.frequency.value = 700;
const lfo = ctx.createOscillator();
lfo.frequency.value = 0.8;
const lfoGain = ctx.createGain();
lfoGain.gain.value = 180;
lfo.connect(lfoGain).connect(o.frequency);
const g = ctx.createGain();
g.gain.value = 0;
o.connect(g).connect(this.sfxGain);
o.start();
lfo.start();
this.sirenNodes = { o, lfo };
this.sirenGain = g;
}

sirenOn(on) {
if (!this.sirenGain) return;
this.sirenGain.gain.setTargetAtTime(on ? 0.05 : 0, this.ctx.currentTime, 0.4);
}

setSiren(level) {
if (!this.sirenGain || !this.ctx) return;
this.sirenGain.gain.setTargetAtTime(clamp(level, 0, 1) * 0.09, this.ctx.currentTime, 0.2);
}


startSequencer() {
this.nextTime = this.ctx.currentTime + 0.1;
this.seqTimer = setInterval(() => {
if (!this.ctx) return;
const st = STATIONS[this.station];
const stepDur = 60 / st.bpm / 4;
while (this.nextTime < this.ctx.currentTime + 0.25) {
this.scheduleStep(st, this.seqStep, this.nextTime);
this.nextTime += stepDur;
this.seqStep = (this.seqStep + 1) % 16;
}
}, 90);
}

scheduleStep(st, step, t) {
if (this.muted) return;
const when = t - this.ctx.currentTime;
const driving = !!S.driving;
const musicVol = driving ? 1 : 0.45;
const bass = st.bass[step];
if (bass) {
this.tone(midi(bass), 0.22, { type: st.wave, gain: 0.3 * musicVol, when, dest: this.musicGain });
}
const lead = st.lead[step];
if (lead) {
this.tone(midi(lead), 0.3, { type: 'triangle', gain: 0.14 * musicVol, when, dest: this.musicGain });
}
if (st.kick[step]) {
this.tone(120, 0.12, { gain: 0.5 * musicVol, when, slideTo: 45, dest: this.musicGain });
}
if (step % 2 === 1) {
this.noise(0.04, { gain: 0.08 * musicVol, when, filterFreq: 7000, type: 'highpass', dest: this.musicGain });
}
}

nextStation() {
this.station = (this.station + 1) % STATIONS.length;
const st = STATIONS[this.station];
S.hud?.setRadio(`${st.name} — ${st.style}`);
S.hud?.toast(`Radio: ${st.name}`);
return st;
}

currentStation() {
return STATIONS[this.station];
}
}
