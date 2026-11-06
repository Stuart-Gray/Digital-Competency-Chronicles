// Title: the village drifts by in the background while the HTML menus run on top.

import { buildMap } from './world.js';
import * as menus from '../ui/menus.js';
import * as layer from '../ui/textLayer.js';
import { startSlot } from '../systems/state.js';

export default class Title extends Phaser.Scene {
  constructor() { super('Title'); }

  create() {
    const { map } = buildMap(this, 'hub');
    const cam = this.cameras.main;
    cam.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.t0 = 0;
    this.maxX = map.widthInPixels - this.scale.width;
    cam.fadeIn(400);

    layer.setHud(null);
    layer.hideTouch();
    layer.hidePanel();
    const go = {
      title: () => menus.titleScreen(go),
      start: (index, slot) => {
        startSlot(index, slot);
        layer.hideScreen();
        cam.fadeOut(250);
        cam.once('camerafadeoutcomplete', () => this.scene.start('Hub'));
      },
    };
    menus.titleScreen(go);
  }

  update(time, delta) {
    this.t0 += delta / 1000;
    const cam = this.cameras.main;
    cam.scrollX = (Math.sin(this.t0 / 12) * 0.5 + 0.5) * this.maxX;
    cam.scrollY = 20 + Math.sin(this.t0 / 9) * 15;
  }
}
