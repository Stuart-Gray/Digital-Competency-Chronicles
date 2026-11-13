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
    this.arrivalDue = false;
    this.calmSince = 0;
    if (!slot.flags.met_guide) this.time.delayedCall(500, () => this.talk('hub_welcome'));
    else this.expectArrival(500);
  }

  /**
   * The village grows: each entry of "arrivals" in hub.json is a short scene played once, when
   * the player comes home (or has just helped someone) after its story flag is set:
   *   { "if": flag, "seen": flag the scene sets when it is over, "node": dialogue node,
   *     "quest": the side quest this newcomer brings (optional) }
   * To keep the village calm, an entry with a "quest" waits until there is room: never more
   * than "questsAtOnce" neighbours waiting for help, and one newcomer at a time.
   */
  async arrivals() {
    if (this.arriving) return;
    this.arriving = true;
    const slot = state.slot;
    let newcomers = 0;
    try {
      for (const a of content.get(this.FILE).arrivals || []) {
        if (!this.flagOn(a.if) || slot.flags[a.seen]) continue;
        if (a.quest) {
          if (quests.isDone(slot, a.quest)) { slot.flags[a.seen] = true; continue; } // an older save: already helped
          if (newcomers || !quests.hasRoom(slot)) continue;
          newcomers++;
        }
        if (layer.isBusy() || this.travelling) { this.expectArrival(800); break; }
        await this.talk(a.node);
        slot.flags[a.seen] = true;
        saveNow();
        this.refresh();
        this.unstick(); // a building or a neighbour may have appeared right where the player stands
      }
    } finally {
      this.arriving = false;
      saveNow();
      this.refresh();
    }
  }

  /** Looks for someone new once the screen has been calm for a moment (ms). */
  expectArrival(wait) {
    this.arrivalDue = true;
    this.arrivalWait = wait;
    this.calmSince = 0;
  }

  /** Helping someone makes room: a moment later (after any "thinking time" card), a new neighbour may move in. */
  completeQuest(id) {
    super.completeQuest(id);
    this.expectArrival(2200);
  }

  update(time, delta) {
    super.update(time, delta);
    if (!this.arrivalDue || this.arriving) return;
    if (layer.isBusy() || this.travelling) { this.calmSince = 0; return; }
    if (!this.calmSince) { this.calmSince = time; return; }
    if (time - this.calmSince < this.arrivalWait) return;
    this.arrivalDue = false;
    this.arrivals();
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
