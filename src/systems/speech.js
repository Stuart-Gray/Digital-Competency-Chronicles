// Built-in read-aloud using the browser's own voices (no network).
// A fallback for when Read&Write is not installed; Read&Write can read the HTML text directly.

let enabled = false;

export function setReadAloud(on) {
  enabled = !!on;
  if (!enabled) stop();
}

export function isSupported() { return 'speechSynthesis' in window; }

function pickVoice(lang) {
  const voices = window.speechSynthesis.getVoices() || [];
  const want = lang === 'fr' ? ['fr-CA', 'fr'] : ['en-CA', 'en'];
  for (const w of want) {
    const v = voices.find((x) => x.lang && x.lang.replace('_', '-').toLowerCase().startsWith(w.toLowerCase()));
    if (v) return v;
  }
  return null;
}

export function speak(text, lang) {
  if (!enabled || !isSupported() || !text) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang === 'fr' ? 'fr-CA' : 'en-CA';
    const v = pickVoice(lang);
    if (v) u.voice = v;
    u.rate = 0.95;
    window.speechSynthesis.speak(u);
  } catch (e) { /* speech is optional */ }
}

export function stop() {
  if (isSupported()) {
    try { window.speechSynthesis.cancel(); } catch (e) { /* ignore */ }
  }
}
