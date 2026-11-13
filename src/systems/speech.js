// Built-in read-aloud using the browser's own voices (no network of our own, nothing sent).
// A fallback for when Read&Write is not installed; Read&Write can read the HTML text directly.
// The player chooses a female or male voice and a reading speed in Settings; voices.js picks
// the clearest voice of that kind on this device, in English or Quebec French.

import * as music from './music.js';
import * as voices from './voices.js';

let enabled = false;
let gender = 'male';
let rate = 'normal';
const RATES = { slow: 0.8, normal: 0.95, fast: 1.1 };

export function isSupported() { return 'speechSynthesis' in window; }

/** Voices arrive late in Chrome; keep the list fresh. */
let list = [];
function refresh() { try { list = window.speechSynthesis.getVoices() || []; } catch (e) { list = []; } }
if (isSupported()) {
  refresh();
  try { window.speechSynthesis.addEventListener('voiceschanged', refresh); } catch (e) { window.speechSynthesis.onvoiceschanged = refresh; }
}

export function applySettings(s) {
  enabled = !!s.readAloud;
  gender = s.voice === 'female' ? 'female' : 'male';
  rate = RATES[s.speechRate] ? s.speechRate : 'normal';
  if (!enabled) stop();
}

/** Kept for older callers. */
export function setReadAloud(on) { enabled = !!on; if (!enabled) stop(); }

/** The voice that would be used now (for the Settings screen), or null. */
export function currentVoice(lang) {
  if (!isSupported()) return null;
  if (!list.length) refresh();
  return voices.pick(list, lang, gender);
}

function utter(text, lang) {
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang === 'fr' ? 'fr-CA' : 'en-CA';
  const { voice, matched } = currentVoice(lang) || {};
  if (voice) { u.voice = voice; u.lang = voice.lang; }
  // No voice of the chosen kind on this device: shift the pitch a little so the choice still counts.
  u.pitch = matched || !voice ? 1 : gender === 'male' ? 0.8 : 1.2;
  u.rate = RATES[rate];
  music.duck(true);
  u.onend = u.onerror = () => music.duck(false);
  window.speechSynthesis.speak(u);
}

export function speak(text, lang) {
  if (!enabled || !isSupported() || !text) return;
  try { utter(text, lang); } catch (e) { /* speech is optional */ }
}

/** Plays a sample line even while read-aloud is off (the "Try the voice" button). */
export function sample(text, lang) {
  if (!isSupported() || !text) return;
  try { utter(text, lang); } catch (e) { /* ignore */ }
}

export function stop() {
  if (isSupported()) {
    try { window.speechSynthesis.cancel(); } catch (e) { /* ignore */ }
    music.duck(false);
  }
}
