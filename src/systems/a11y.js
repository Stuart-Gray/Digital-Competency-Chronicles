// Accessibility switches that the game code asks about while it runs.
// The settings themselves live in state.settings (Settings screen); this file answers
// "should this move?" and "is high contrast on?" in one place.

let motionSetting = 'auto'; // auto = follow the device's "reduce motion" setting
let contrast = false;
const media = typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
const listeners = new Set();

export function applySettings(s) {
  motionSetting = s.reduceMotion === true || s.reduceMotion === 'on' ? 'on' : s.reduceMotion === 'off' ? 'off' : 'auto';
  contrast = !!s.highContrast;
  document.body.classList.toggle('rm', reducedMotion());
  listeners.forEach((fn) => fn());
}

if (media) {
  const onChange = () => { document.body.classList.toggle('rm', reducedMotion()); listeners.forEach((fn) => fn()); };
  if (media.addEventListener) media.addEventListener('change', onChange); else if (media.addListener) media.addListener(onChange);
}

/** True when the game should keep still: no camera shake, fades, drifting or bobbing. */
export function reducedMotion() {
  if (motionSetting === 'on') return true;
  if (motionSetting === 'off') return false;
  return !!(media && media.matches);
}

/** Does the device itself ask for less motion? (Shown in Settings as a reminder.) */
export function deviceAsksReducedMotion() { return !!(media && media.matches); }

export function highContrast() { return contrast; }

export function onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
