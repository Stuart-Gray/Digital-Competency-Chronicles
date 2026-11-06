// CSS helpers for showing sprites from the art sheets in the HTML layer (journal, HUD, puzzle cards).

import { ICONS, ICON_COLS } from './icons.js';

/** Background position for a frame of assets/sprites/fx.png (one row of 16x16 frames). */
export function fxStyle(frame) {
  return { backgroundPosition: `calc(var(--icon) * ${-frame}) 0` };
}

/** Background position for a named icon in assets/sprites/icons.png. */
export function iconStyle(name) {
  const i = Math.max(0, ICONS.indexOf(name));
  return { backgroundPosition: `calc(var(--icon) * ${-(i % ICON_COLS)}) calc(var(--icon) * ${-Math.floor(i / ICON_COLS)})` };
}

export function hasIcon(name) { return ICONS.includes(name); }

/** Path of a picture or other asset. The single-file Artifact build swaps in embedded copies. */
export function asset(path) {
  const inline = window.DCC_INLINE;
  return (inline && inline.files[path]) || path;
}
