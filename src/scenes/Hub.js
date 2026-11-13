// Hub: the digital village. Walk around, talk to people, go through the open gate.
// Everything shared with the dungeons lives in WorldScene.js.

import World from './WorldScene.js';
import * as achievements from '../systems/achievements.js';
import * as content from '../systems/content.js';
import { state, saveNow } from '../systems/state.js';
import * as quests from '../systems/quests.js';
import * as layer from '../ui/textLayer.js';

export default class Hub extends World {
  constructor() {
    super('Hub', { file: 'hub', map: 'hub', tileset: ['village', 'tiles'], place: 'hub.place', music: 'village', shimmer: [3, 25] });
  }

  onArrive() {
    const slot = state.slot;
    achievements.unlock(slot, 'first_steps') && saveNow();
    if (!slot.flags.met_guide) this.time.delayedCall(500, () => this.talk('hub_welcome'));
    else this.time.delayedCall(500, () => this.arrivals());
  }

  /**
   * The village grows: each entry of "arrivals" in hub.json is a short scene played once,
   * the first time the player comes home after its story flag is set
   * ({ "if": flag, "seen": flag the scene sets when it is over, "node": dialogue node }).
   */
  async arrivals() {
    const slot = state.slot;
    for (const a of content.get(this.FILE).arrivals || []) {
      if (!this.flagOn(a.if) || slot.flags[a.seen]) continue;
      if (layer.isBusy() || this.travelling) return;
      await this.talk(a.node);
      slot.flags[a.seen] = true;
      saveNow();
      this.refresh();
    }
  }

  /** "quests_open" lets the village board say whether anyone needs a hand right now. */
  refresh() {
    const flags = state.slot.flags;
    if (quests.anyOpen(state.slot)) flags.quests_open = true;
    else delete flags.quests_open;
    super.refresh();
  }

  afterTalk() {
    const slot = state.slot;
    // "Everyone" means everyone who lives here today: more people move in as the village grows.
    const npcs = this.objects.filter((o) => o.type === 'npc' && o.active).map((o) => o.props.npc);
    if (npcs.every((n) => slot.flags['talked_' + n])) achievements.unlock(slot, 'meet_everyone');
  }
}
