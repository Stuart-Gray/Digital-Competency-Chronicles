// The Digital Competency Chronicles: game entry point.
// Plain ES modules, Phaser 3 from a CDN, no build step.

import Boot from './scenes/Boot.js';
import Preload from './scenes/Preload.js';
import Title from './scenes/Title.js';
import Hub from './scenes/Hub.js';
import Dungeon2 from './scenes/Dungeon2.js';
import { GAME_W, GAME_H } from './ui/textLayer.js';

export const VERSION = '0.2.0';

if (!window.Phaser) {
  // Phaser comes from the CDN; without it the game cannot start.
  document.getElementById('load-error').hidden = false;
  document.getElementById('stage').hidden = true;
} else {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: GAME_W,
    height: GAME_H,
    pixelArt: true,
    roundPixels: true,
    backgroundColor: '#14121c',
    physics: { default: 'arcade', arcade: { debug: false } },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    input: { keyboard: false }, // keyboard is handled by src/systems/input.js
    scene: [Boot, Preload, Title, Hub, Dungeon2],
  });
  // A small handle for testing and for curious developers. Holds no personal data.
  window.DCC = { game, version: VERSION, debug: {} };
}
