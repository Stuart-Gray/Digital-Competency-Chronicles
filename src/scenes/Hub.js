// Hub: the digital village. Walk around, talk to people, go through the open gate.
// Everything shared with the dungeons lives in WorldScene.js.

import World from './WorldScene.js';
import * as achievements from '../systems/achievements.js';
import * as content from '../systems/content.js';
import { state, saveNow } from '../systems/state.js';

export default class Hub extends World {
  constructor() {
    super('Hub', { file: 'hub', map: 'hub', tileset: ['village', 'tiles'], place: 'hub.place' });
  }

  onArrive() {
    const slot = state.slot;
    achievements.unlock(slot, 'first_steps') && saveNow();
    if (!slot.flags.met_guide) this.time.delayedCall(500, () => this.talk('hub_welcome'));
    else if (slot.flags.area2_done && !slot.flags.saw_village_grow) this.time.delayedCall(500, () => this.talk('village_grew'));
  }

  afterTalk() {
    const slot = state.slot;
    const npcs = Object.keys(content.get(this.FILE).npcs);
    if (npcs.every((n) => slot.flags['talked_' + n])) achievements.unlock(slot, 'meet_everyone');
  }
}
