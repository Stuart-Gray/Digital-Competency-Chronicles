// Preload: loads content files, the map and the art, then checks the content.

import * as content from '../systems/content.js';
import { setUiStrings } from '../systems/i18n.js';
import * as music from '../systems/music.js';

const NPC_ROWS = 9; // rows in assets/sprites/npcs.png

export default class Preload extends Phaser.Scene {
  constructor() { super('Preload'); }

  preload() {
    const { width, height } = this.scale;
    const box = this.add.rectangle(width / 2, height / 2, 162, 10).setStrokeStyle(1, 0xffffff);
    const bar = this.add.rectangle(width / 2 - 80, height / 2, 0, 6, 0xffd84a).setOrigin(0, 0.5);
    this.load.on('progress', (v) => { bar.width = 160 * v; });
    this.load.on('complete', () => { box.destroy(); bar.destroy(); });

    // A single-file build (tools/build-artifact.mjs) puts everything in window.DCC_INLINE.
    const inline = window.DCC_INLINE;
    const file = (path) => (inline && inline.files[path]) || path;
    for (const name of content.CONTENT_FILES) {
      if (inline) this.cache.json.add('content-' + name, inline.files[`content/${name}.json`]);
      else this.load.json('content-' + name, `content/${name}.json`);
    }
    this.load.tilemapTiledJSON('hub', file('maps/hub.tmj'));
    this.load.tilemapTiledJSON('area2', file('maps/area2.tmj'));
    this.load.image('tiles', file('assets/tiles/village.png'));
    this.load.image('dungeon-tiles', file('assets/tiles/dungeon.png'));
    this.load.spritesheet('fx', file('assets/sprites/fx.png'), { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet('hero', file('assets/sprites/hero.png'), { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet('npcs', file('assets/sprites/npcs.png'), { frameWidth: 16, frameHeight: 16 });
  }

  create() {
    content.init(this.cache);
    setUiStrings(content.get('ui'));
    music.setSongs(content.get('music'));
    this.makeAnimations();
    this.scene.start('Title');
  }

  makeAnimations() {
    const dirs = ['down', 'up', 'left', 'right'];
    for (let a = 0; a < 4; a++) {
      dirs.forEach((d, di) => {
        const base = a * 12 + di * 3;
        this.anims.create({ key: `hero${a}-walk-${d}`, frames: this.anims.generateFrameNumbers('hero', { frames: [base + 1, base, base + 2, base] }), frameRate: 8, repeat: -1 });
        this.anims.create({ key: `hero${a}-idle-${d}`, frames: [{ key: 'hero', frame: base }] });
      });
    }
    for (let n = 0; n < NPC_ROWS; n++) {
      this.anims.create({ key: `npc${n}-idle`, frames: this.anims.generateFrameNumbers('npcs', { frames: [n * 2, n * 2, n * 2 + 1] }), frameRate: 2, repeat: -1 });
    }
  }
}
