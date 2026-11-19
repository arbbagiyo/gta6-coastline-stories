import { S } from './state.js';

export const input = {
keys: new Set(),
mouseDX: 0,
mouseDY: 0,
mouseDown: false,
mouseClicked: false,
locked: false,
dragging: false,
lastX: 0,
lastY: 0,
pressed: new Set(),
};

const GAME_KEYS = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'ShiftLeft', 'ShiftRight', 'KeyF', 'KeyE', 'KeyR', 'KeyQ', 'KeyM', 'KeyN', 'KeyP', 'KeyH', 'Escape', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Tab'];

export function initInput(canvas, callbacks) {
window.addEventListener('keydown', (e) => {
if (GAME_KEYS.includes(e.code)) e.preventDefault();
if (!e.repeat) {
input.keys.add(e.code);
input.pressed.add(e.code);
callbacks?.onKey?.(e.code);
}
});
window.addEventListener('keyup', (e) => {
input.keys.delete(e.code);
});
window.addEventListener('blur', () => {
input.keys.clear();
input.mouseDown = false;
input.dragging = false;
});
canvas.addEventListener('mousedown', (e) => {
input.mouseDown = true;
input.mouseClicked = true;
input.dragging = true;
input.lastX = e.clientX;
input.lastY = e.clientY;
if (S.screen === 'play' && !input.locked && e.button === 0) {
canvas.requestPointerLock?.();
}
});
window.addEventListener('mouseup', (e) => {
if (e.button === 0) input.mouseDown = false;
input.dragging = false;
});
document.addEventListener('pointerlockchange', () => {
input.locked = document.pointerLockElement === canvas;
});
window.addEventListener('mousemove', (e) => {
if (input.locked) {
input.mouseDX += e.movementX;
input.mouseDY += e.movementY;
} else if (input.dragging) {
input.mouseDX += (e.clientX - input.lastX) * 1.6;
input.mouseDY += (e.clientY - input.lastY) * 1.6;
input.lastX = e.clientX;
input.lastY = e.clientY;
}
});
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
}

export function endFrameInput() {
input.mouseDX = 0;
input.mouseDY = 0;
input.mouseClicked = false;
input.pressed.clear();
}

export function axis() {
let x = 0, y = 0;
if (input.keys.has('KeyW') || input.keys.has('ArrowUp')) y += 1;
if (input.keys.has('KeyS') || input.keys.has('ArrowDown')) y -= 1;
if (input.keys.has('KeyA') || input.keys.has('ArrowLeft')) x -= 1;
if (input.keys.has('KeyD') || input.keys.has('ArrowRight')) x += 1;
return { x, y };
}
