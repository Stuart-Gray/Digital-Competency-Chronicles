// Background music: a tiny chiptune player built on the browser's Web Audio API.
// No audio files. The songs are note lists in content/music.json (original compositions,
// see docs/content-schema.md), played on four retro-style channels:
//   pulse1, pulse2  square-ish "pulse" waves (the duty sets how thin they sound)
//   triangle        a soft triangle wave for bass lines
//   noise           drums: k (kick), s (snare), h (hi-hat)
//
// Browsers (iPads most of all) only allow sound after the player taps or presses a key,
// so the audio starts on the first touch, click or key press. Nothing plays when the
// setting is off, and the music pauses while the tab is hidden.

// Each step is about 8 decibels apart, so the three levels sound clearly different.
const VOLUMES = { low: 0.008, medium: 0.02, high: 0.05 };
const FADE_OUT = 0.7;     // seconds, when leaving a place
const FADE_IN = 1.0;      // seconds, when arriving
const LOOKAHEAD = 0.15;   // seconds of notes scheduled ahead of time
const DUCK = 0.35;        // music level while read-aloud is speaking

const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

let songs = {};
let ctx = null;
let master = null;        // volume from the settings
let duckGain = null;      // lowered while read-aloud speaks
let noiseBuffer = null;
const waves = {};         // duty -> PeriodicWave
let enabled = true;
let volume = 'medium';
let wanted = null;        // the song this place asks for (even before audio is unlocked)
let current = null;       // { id, player }
let unlocked = false;

/** Called by Preload with content/music.json. */
export function setSongs(data) { songs = (data && data.songs) || {}; }

export function songIds() { return Object.keys(songs); }

// ---------- parsing the note strings ----------

/** "C#5" -> frequency in Hz, or null for a rest. */
export function noteFreq(name) {
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(name);
  if (!m) return null;
  const semis = NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  const midi = 12 * (Number(m[3]) + 1) + semis;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/**
 * Turns one channel line into notes. Tokens are separated by spaces; "|" marks a bar
 * line and is only there to help people read. A token is a note (C5, F#4, Bb3), a drum
 * (k, s, h) or a rest (-), with an optional ":length" in steps (default 1).
 */
export function parseLine(line) {
  const out = [];
  let step = 0;
  for (const tok of String(line || '').trim().split(/\s+/)) {
    if (!tok || tok === '|') continue;
    const [name, lenRaw] = tok.split(':');
    const len = lenRaw ? Number(lenRaw) : 1;
    if (!(len > 0)) throw new Error(`bad length in "${tok}"`);
    if (name !== '-') {
      if (!['k', 's', 'h'].includes(name) && noteFreq(name) == null) throw new Error(`unknown note "${tok}"`);
      out.push({ step, len, name });
    }
    step += len;
  }
  return { notes: out, steps: step };
}

/** Joins a song's parts in order into one list of notes per channel. */
export function compile(song) {
  const channels = {};
  let offset = 0;
  for (const partId of song.order) {
    const part = song.parts[partId];
    let partSteps = 0;
    for (const [ch, line] of Object.entries(part)) {
      const { notes, steps } = parseLine(line);
      (channels[ch] = channels[ch] || []).push(...notes.map((n) => ({ ...n, step: n.step + offset })));
      partSteps = Math.max(partSteps, steps);
    }
    offset += partSteps;
  }
  // Index notes by the step they start on, so the scheduler can look them up quickly.
  const byStep = new Map();
  for (const [ch, notes] of Object.entries(channels)) {
    for (const n of notes) {
      if (!byStep.has(n.step)) byStep.set(n.step, []);
      byStep.get(n.step).push({ ...n, ch });
    }
  }
  return { byStep, steps: offset };
}

// ---------- the audio graph ----------

function makeContext() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  try {
    ctx = new AC();
  } catch (e) { return null; }
  master = ctx.createGain();
  duckGain = ctx.createGain();
  master.gain.value = enabled ? VOLUMES[volume] : 0;
  // A gentle low-pass keeps the square waves from sounding harsh on small speakers.
  const tone = ctx.createBiquadFilter();
  tone.type = 'lowpass';
  tone.frequency.value = 6500;
  duckGain.connect(master).connect(tone).connect(ctx.destination);
  // White noise for the drums.
  noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noiseBuffer.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return ctx;
}

/** A pulse wave with the given duty (0.125, 0.25 or 0.5), built from 24 harmonics. */
function pulseWave(duty) {
  if (waves[duty]) return waves[duty];
  const n = 24;
  const real = new Float32Array(n + 1);
  const imag = new Float32Array(n + 1);
  for (let k = 1; k <= n; k++) real[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty);
  waves[duty] = ctx.createPeriodicWave(real, imag);
  return waves[duty];
}

function playTone(out, ch, freq, t, dur, vol) {
  const osc = ctx.createOscillator();
  if (ch.wave === 'triangle') osc.type = 'triangle';
  else osc.setPeriodicWave(pulseWave(ch.duty || 0.5));
  osc.frequency.value = freq;
  const g = ctx.createGain();
  const end = t + Math.max(0.03, dur * (ch.gate || 0.9));
  const sustain = vol * (ch.sustain != null ? ch.sustain : 0.75);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.006);
  g.gain.linearRampToValueAtTime(sustain, t + 0.08);
  g.gain.setValueAtTime(sustain, end - 0.02);
  g.gain.linearRampToValueAtTime(0, end);
  osc.connect(g).connect(out);
  osc.start(t);
  osc.stop(end + 0.01);
}

function playDrum(out, kind, t, vol) {
  if (kind === 'k') {
    // A short falling tone, like the low thump of an old console's noise channel.
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol * 1.4, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    osc.connect(g).connect(out);
    osc.start(t);
    osc.stop(t + 0.15);
    return;
  }
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;
  const f = ctx.createBiquadFilter();
  const g = ctx.createGain();
  const len = kind === 's' ? 0.12 : 0.04;
  f.type = kind === 's' ? 'bandpass' : 'highpass';
  f.frequency.value = kind === 's' ? 1800 : 7000;
  g.gain.setValueAtTime(vol * (kind === 's' ? 0.9 : 0.5), t);
  g.gain.exponentialRampToValueAtTime(0.001, t + len);
  src.connect(f).connect(g).connect(out);
  src.start(t, Math.random() * 0.5);
  src.stop(t + len + 0.01);
}

/** Plays one song on a loop until stopped. Each song has its own gain node for fades. */
function makePlayer(id) {
  const song = songs[id];
  const { byStep, steps } = compile(song);
  const stepDur = 60 / song.bpm / (song.stepsPerBeat || 2);
  const out = ctx.createGain();
  out.gain.value = 0;
  out.connect(duckGain);
  let step = 0;
  let next = ctx.currentTime + 0.1;
  let timer = null;

  const tick = () => {
    while (next < ctx.currentTime + LOOKAHEAD) {
      for (const n of byStep.get(step) || []) {
        const ch = song.channels[n.ch] || {};
        const vol = ch.volume != null ? ch.volume : 0.5;
        if (ch.wave === 'noise') playDrum(out, n.name, next, vol);
        else playTone(out, ch, noteFreq(n.name), next, n.len * stepDur, vol);
      }
      next += stepDur;
      step = (step + 1) % steps;
    }
  };

  return {
    start() {
      const t = ctx.currentTime;
      out.gain.setValueAtTime(0, t);
      out.gain.linearRampToValueAtTime(1, t + FADE_IN);
      next = Math.max(next, t + 0.05);
      tick();
      timer = setInterval(tick, 25);
    },
    stop(fade = FADE_OUT) {
      const t = ctx.currentTime;
      out.gain.cancelScheduledValues(t);
      out.gain.setValueAtTime(out.gain.value, t);
      out.gain.linearRampToValueAtTime(0, t + fade);
      setTimeout(() => { clearInterval(timer); out.disconnect(); }, (fade + LOOKAHEAD + 0.1) * 1000);
    },
  };
}

// ---------- what the rest of the game calls ----------

/** Start (or crossfade to) the song for this place. Safe to call before audio is unlocked. */
export function play(id) {
  if (id && !songs[id]) { console.warn('Unknown song:', id); id = null; }
  wanted = id || null;
  sync();
}

export function stop() { wanted = null; sync(); }

function sync() {
  if (!ctx || !unlocked) return;
  const target = enabled && !document.hidden ? wanted : null;
  if (current && current.id === target) return;
  if (current) { current.player.stop(); current = null; }
  if (target) {
    const player = makePlayer(target);
    player.start();
    current = { id: target, player };
  }
}

/** Applies the music settings: { music: true/false, musicVolume: 'low' | 'medium' | 'high' }. */
export function applySettings(s) {
  enabled = s.music !== false;
  volume = VOLUMES[s.musicVolume] ? s.musicVolume : 'medium';
  if (master) {
    const t = ctx.currentTime;
    master.gain.cancelScheduledValues(t);
    master.gain.setValueAtTime(master.gain.value, t);
    master.gain.linearRampToValueAtTime(enabled ? VOLUMES[volume] : 0, t + 0.15);
  }
  sync();
}

/** Lowers the music while read-aloud is speaking. */
export function duck(on) {
  if (!duckGain) return;
  const t = ctx.currentTime;
  duckGain.gain.cancelScheduledValues(t);
  duckGain.gain.setValueAtTime(duckGain.gain.value, t);
  duckGain.gain.linearRampToValueAtTime(on ? DUCK : 1, t + 0.25);
}

/** For tests and the curious: what is playing right now. */
export function status() {
  return { unlocked, enabled, volume, wanted, playing: current ? current.id : null, state: ctx ? ctx.state : 'none' };
}

/** Waits for the first tap, click or key press, then starts the audio (the iPad rule). */
export function installUnlock() {
  const unlock = () => {
    if (!ctx && !makeContext()) return;
    // iOS needs a sound started inside the tap itself; a silent one-sample buffer does it.
    try {
      const b = ctx.createBufferSource();
      b.buffer = ctx.createBuffer(1, 1, 22050);
      b.connect(ctx.destination);
      b.start(0);
    } catch (e) { /* ignore */ }
    const done = () => {
      if (ctx.state !== 'running') return;
      unlocked = true;
      ['pointerdown', 'touchend', 'keydown'].forEach((ev) => document.removeEventListener(ev, unlock, true));
      sync();
    };
    if (ctx.state === 'running') done();
    else ctx.resume().then(done, () => {});
  };
  ['pointerdown', 'touchend', 'keydown'].forEach((ev) => document.addEventListener(ev, unlock, true));
  document.addEventListener('visibilitychange', () => {
    if (!ctx || !unlocked) return;
    if (document.hidden) { if (current) { current.player.stop(0.05); current = null; } ctx.suspend().catch(() => {}); }
    else ctx.resume().then(sync, () => {});
  });
}
