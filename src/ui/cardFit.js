// Card fit: keeps a question card (a puzzle or a thinking-time card) on one screen, so a young
// player can see the whole question and every answer without scrolling.
//
// A card marked with the class "pz" is measured when it opens, at its fullest: with its longest
// hint and its "well done" message in place, and with the parts that only appear later (the rest
// of a short scene, the clues still to find). If that does not fit, the card moves up one step
// at a time until it does:
//   1. the answers sit two by two instead of in one list
//   2. the whole card (words, pictures and spacing) gets a little smaller, in small steps
// The step is chosen once, when the card opens, so the card keeps its shape and its top edge
// stays where it is while the child plays. If a card still does not fit at the last step, it
// scrolls as before.
//
// The words never get smaller when Settings > Text size is Large or Larger: there the size the
// player chose matters more than fitting, and the card may scroll.
// tests/cards.mjs opens every card and reports the ones that still need scrolling.

const SCALES = [0.94, 0.88, 0.82]; // the smallest is still about 19 px on a 1280 x 720 laptop

let watched = null; // { card, panel, step, observer, sizeObserver }

function mayShrink() {
  const scale = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--text-scale')) || 1;
  return scale <= 1;
}

/** The steps this card can use, gentlest first. */
function stepsFor(card) {
  const steps = [{ cols: false, scale: 1 }];
  const answers = card.querySelector('.options');
  if (answers && answers.children.length > 2) steps.push({ cols: true, scale: 1 });
  const cols = steps.length > 1;
  if (mayShrink()) for (const scale of SCALES) steps.push({ cols, scale });
  return steps;
}

function apply(card, step, index) {
  card.classList.toggle('cols', step.cols);
  card.style.setProperty('--fit', String(step.scale));
  card.dataset.fit = String(index);
}

/**
 * The card at its fullest. Each "phase" is one way the card can be full (a sorting card is
 * full at the start, with every item waiting, and again at the end, with every item in a box).
 */
function measure(card) {
  const phases = (card.dataset.phases || '').split(' ');
  card.classList.add('measuring');
  let fits = true, tallest = 0;
  for (const phase of phases) {
    if (phase) card.classList.add('ph-' + phase);
    const h = card.scrollHeight;
    if (h > card.clientHeight + 1) fits = false;
    if (h > tallest) tallest = h;
    if (phase) card.classList.remove('ph-' + phase);
  }
  card.classList.remove('measuring');
  return { fits, tallest };
}

function fit(fresh) {
  const w = watched;
  if (!w || !w.card.isConnected) return;
  const { card, panel } = w;
  if (w.observer) w.observer.disconnect();
  card.style.marginTop = '0px';
  const steps = stepsFor(card);
  // While a card is open it only ever moves to a tighter step, never back (no jumping about).
  let i = fresh ? 0 : Math.min(w.step, steps.length - 1);
  let m;
  for (; i < steps.length; i++) {
    apply(card, steps[i], i);
    m = measure(card);
    if (m.fits) break;
  }
  if (i >= steps.length) i = steps.length - 1;
  w.step = i;
  card.dataset.scrolls = m.fits ? 'false' : 'true';
  moreBelow(card);

  // Centred, but never so low that the card at its fullest would leave the screen: the top
  // edge then stays still when a hint appears.
  const cs = getComputedStyle(panel);
  const room = panel.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
  const border = card.offsetHeight - card.clientHeight;
  const now = card.offsetHeight;
  const top = Math.max(0, Math.min((room - now) / 2, room - (m.tallest + border)));
  card.style.marginTop = Math.floor(top) + 'px';

  if (w.observer) w.observer.observe(card, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['hidden', 'class', 'disabled'] });
}

/**
 * A card that has to scroll (Large or Larger text, mostly) shows a small arrow at its bottom
 * edge while there is more to read below, so a child knows to scroll.
 */
function moreBelow(card) {
  let cue = card.querySelector(':scope > .more-below');
  const hidden = card.scrollHeight - card.clientHeight - card.scrollTop < 8;
  if (!cue) {
    if (hidden) return;
    cue = document.createElement('div');
    cue.className = 'more-below';
    cue.setAttribute('aria-hidden', 'true');
    cue.appendChild(document.createElement('span')).textContent = '▼';
    card.appendChild(cue);
    card.addEventListener('scroll', () => { cue.hidden = card.scrollHeight - card.clientHeight - card.scrollTop < 8; }, { passive: true });
  }
  cue.hidden = hidden;
}

/** Starts looking after a card that was just put in the panel. Other cards are left alone. */
export function watch(card, panel) {
  stop();
  if (!card.classList.contains('pz')) return;
  watched = { card, panel, step: 0, observer: null, sizeObserver: null };
  if (typeof MutationObserver !== 'undefined') watched.observer = new MutationObserver(() => fit(false));
  if (typeof ResizeObserver !== 'undefined') {
    // A new window size (or the tablet turning) starts again from the gentlest step.
    let first = true;
    watched.sizeObserver = new ResizeObserver(() => { if (first) { first = false; return; } fit(true); });
    watched.sizeObserver.observe(panel);
  }
  // A picture that finishes loading changes the card's height without changing the page.
  card.addEventListener('load', () => fit(true), true);
  fit(true);
}

export function stop() {
  if (!watched) return;
  if (watched.observer) watched.observer.disconnect();
  if (watched.sizeObserver) watched.sizeObserver.disconnect();
  watched = null;
}

/** Measures the open card again from the start (a setting changed, or the letters finished loading). */
export function refit() { fit(true); }

if (typeof document !== 'undefined' && document.fonts && document.fonts.addEventListener) {
  document.fonts.addEventListener('loadingdone', () => fit(true));
}
