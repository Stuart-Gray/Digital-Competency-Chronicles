// Dungeon 2: Understanding digital identity (sheet 2, elements 2a, 2b, 2c).
// Three wings and a final room, lit by the Lantern of Traces. The map is maps/area2.tmj,
// the words and puzzles are content/area2.json. Everything else is shared (WorldScene.js).

import World from './WorldScene.js';
import { state } from '../systems/state.js';

export default class Dungeon2 extends World {
  constructor() {
    super('Dungeon2', { file: 'area2', map: 'area2', tileset: ['dungeon', 'dungeon-tiles'], place: 'area2.place', dark: true, music: 'temple' });
  }

  onArrive() {
    const slot = state.slot;
    if (!slot.flags.met_lumi) this.time.delayedCall(450, () => this.talk('lumi_intro'));
  }
}
