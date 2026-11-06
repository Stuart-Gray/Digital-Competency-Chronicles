// Boot: applies saved settings and waits for the fonts, then hands over to Preload.

import { applySettings } from '../systems/state.js';

export default class Boot extends Phaser.Scene {
  constructor() { super('Boot'); }

  create() {
    applySettings();
    const fonts = document.fonts
      ? Promise.all([
        document.fonts.load('16px "Atkinson Hyperlegible"'),
        document.fonts.load('16px "Press Start 2P"'),
      ]).catch(() => {})
      : Promise.resolve();
    // Never wait more than 2 seconds for fonts.
    Promise.race([fonts, new Promise((r) => setTimeout(r, 2000))]).then(() => this.scene.start('Preload'));
  }
}
