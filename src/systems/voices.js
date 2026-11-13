// Picks the clearest built-in voice for read-aloud, by language and by the player's choice
// of a female or male voice. Chromebooks, Windows and iPads each have different voices, and
// the browser does not say which voice is female or male, so we keep a list of the voices
// these devices are known to have. Voices on the list come first, best first; any other voice
// in the right language is a fallback. Novelty voices (Bells, Zarvox...) are never used.
//
// Only voice names are read from the device. Nothing is sent anywhere.

// Known voices, best first. Each entry: [name match (lower case), gender].
// "Natural"/"Online" voices (Edge, Windows 11) and "Enhanced"/"Premium" voices (iPad) sound
// most human; Google voices (Chrome, Chromebook) are next; older desktop voices last.
const KNOWN = {
  en: [
    // Windows 11 / Edge natural voices (Canadian first)
    ['clara', 'female'], ['liam', 'male'],
    ['jenny', 'female'], ['aria', 'female'], ['ava', 'female'], ['emma', 'female'], ['michelle', 'female'], ['ana', 'female'],
    ['andrew', 'male'], ['brian', 'male'], ['guy', 'male'], ['christopher', 'male'], ['eric', 'male'], ['steffan', 'male'], ['roger', 'male'],
    ['sonia', 'female'], ['libby', 'female'], ['ryan', 'male'], ['natasha', 'female'], ['william', 'male'],
    // iPad, Mac
    ['samantha', 'female'], ['allison', 'female'], ['susan', 'female'], ['nicky', 'female'], ['karen', 'female'], ['moira', 'female'], ['tessa', 'female'], ['serena', 'female'], ['kate', 'female'], ['zoe', 'female'],
    ['aaron', 'male'], ['evan', 'male'], ['nathan', 'male'], ['tom', 'male'], ['alex', 'male'], ['daniel', 'male'], ['arthur', 'male'], ['oliver', 'male'], ['lee', 'male'],
    // Chrome and Chromebook (Google voices)
    ['google us english', 'female'], ['google uk english female', 'female'], ['google uk english male', 'male'],
    // Older Windows voices
    ['linda', 'female'], ['zira', 'female'], ['hazel', 'female'], ['heera', 'female'],
    ['richard', 'male'], ['david', 'male'], ['mark', 'male'], ['george', 'male'], ['james', 'male'],
  ],
  fr: [
    // Windows 11 / Edge natural voices, Quebec first
    ['sylvie', 'female'], ['antoine', 'male'], ['jean', 'male'], ['thierry', 'male'],
    ['denise', 'female'], ['eloise', 'female'], ['vivienne', 'female'], ['henri', 'male'], ['remy', 'male'],
    // iPad, Mac (Amélie and Nicolas are Canadian French)
    ['amélie', 'female'], ['amelie', 'female'], ['chantal', 'female'], ['nicolas', 'male'],
    ['audrey', 'female'], ['aurélie', 'female'], ['marie', 'female'], ['thomas', 'male'], ['jacques', 'male'],
    // Chrome and Chromebook
    ['google français', 'female'], ['google francais', 'female'],
    // Older Windows voices
    ['caroline', 'female'], ['claude', 'male'], ['hortense', 'female'], ['julie', 'female'], ['paul', 'male'],
  ],
};

// Fun voices on Apple devices: hard to understand, never picked.
const NOVELTY = ['albert', 'bad news', 'bahh', 'bells', 'boing', 'bubbles', 'cellos', 'good news', 'jester', 'organ',
  'superstar', 'trinoids', 'whisper', 'wobble', 'zarvox', 'fred', 'junior', 'kathy', 'ralph', 'deranged', 'hysterical',
  'pipe organ', 'princess', 'eddy', 'flo', 'grandma', 'grandpa', 'reed', 'rocko', 'sandy', 'shelley'];

const norm = (s) => (s || '').toLowerCase();
const words = (s) => norm(s).split(/[^\p{L}]+/u).filter(Boolean);

/** Does the voice name contain these whole words, in order? ("ana" must not match "Canada".) */
function hasWords(name, match) {
  const w = words(name), m = match.split(' ');
  for (let i = 0; i + m.length <= w.length; i++) if (m.every((x, j) => w[i + j] === x)) return true;
  return false;
}
const langOf = (v) => norm(v.lang).replace('_', '-');

function isNovelty(name) {
  return NOVELTY.some((x) => words(name).slice(0, x.split(' ').length).join(' ') === x);
}

/** female, male, or null when we do not know this voice. */
export function genderOf(voice, lang) {
  const w = words(voice.name);
  if (w.includes('female') || w.includes('femme')) return 'female';
  if (w.includes('male') || w.includes('homme')) return 'male';
  for (const [match, g] of KNOWN[lang] || []) if (hasWords(voice.name, match)) return g;
  return null;
}

/** Higher is better: language and region, then how natural the voice sounds. */
function score(voice, lang, gender) {
  const l = langOf(voice);
  const n = norm(voice.name);
  let s = 0;
  if (lang === 'fr') {
    if (!l.startsWith('fr')) return -Infinity;
    s += l === 'fr-ca' ? 40 : l === 'fr-fr' ? 20 : 10; // Quebec French first
  } else {
    if (!l.startsWith('en')) return -Infinity;
    s += l === 'en-ca' ? 30 : l === 'en-us' ? 26 : l === 'en-gb' ? 22 : 12;
  }
  if (isNovelty(voice.name)) return -Infinity;
  const g = genderOf(voice, lang);
  if (g === gender) s += 100; else if (g) s -= 100; // a known voice of the other gender is a last resort
  if (/natural|neural|online/.test(n)) s += 30;
  if (/enhanced|premium|siri/.test(n)) s += 25;
  if (/^google/.test(n)) s += 15;
  // Earlier on the known list = clearer.
  const known = (KNOWN[lang] || []).findIndex(([match]) => hasWords(voice.name, match));
  if (known >= 0) s += 20 - Math.min(19, known / 3);
  if (voice.default) s += 2;
  return s;
}

/**
 * The best voice for this language and gender, from a list of SpeechSynthesisVoice.
 * Returns { voice, matched } where matched is false when no voice of that gender exists
 * on this device (the caller then lowers or raises the pitch a little instead).
 */
export function pick(voices, lang, gender = 'female') {
  let best = null, bestScore = -Infinity;
  for (const v of voices || []) {
    const sc = score(v, lang, gender);
    if (sc > bestScore) { best = v; bestScore = sc; }
  }
  if (!best) return { voice: null, matched: false };
  return { voice: best, matched: genderOf(best, lang) === gender };
}
