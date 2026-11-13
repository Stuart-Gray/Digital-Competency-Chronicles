// Title: the village drifts by in the background while the HTML menus run on top.

import { buildMap } from './world.js';
import * as menus from '../ui/menus.js';
import * as layer from '../ui/textLayer.js';
import { startSlot } from '../systems/state.js';
import * as music from '../systems/music.js';
import * as a11y from '../systems/a11y.js';

export default class Title extends Phaser.Scene {
  constructor() { super('Title'); }

  create() {
    const { map } = buildMap(this, 'hub');
    const cam = this.cameras.main;
    cam.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.t0 = 0;
    this.maxX = map.widthInPixels - this.scale.width;
    cam.scrollX = this.maxX / 2; cam.scrollY = 20;
    if (!a11y.reducedMotion()) cam.fadeIn(400);
    music.play('title');

    layer.setHud(null);
    layer.hideTouch();
    layer.hidePanel();
    const go = {
      title: () => menus.titleScreen(go),
      start: (index, slot) => {
        startSlot(index, slot);
        layer.hideScreen();
        const loc = slot.location || {};
        const scene = this.scene.get(loc.scene) ? loc.scene : 'Hub';
        const go = () => this.scene.start(scene, { spawn: loc.x == null ? loc.spawn : undefined });
        if (a11y.reducedMotion()) { this.time.delayedCall(60, go); return; }
        cam.fadeOut(250);
        cam.once('camerafadeoutcomplete', go);
      },
    };
    menus.titleScreen(go);
  }

  update(time, delta) {
    if (a11y.reducedMotion()) return; // the village stays still behind the menus
    this.t0 += delta / 1000;
    const cam = this.cameras.main;
    cam.scrollX = (Math.sin(this.t0 / 12) * 0.5 + 0.5) * this.maxX;
    cam.scrollY = 20 + Math.sin(this.t0 / 9) * 15;
  }
}
