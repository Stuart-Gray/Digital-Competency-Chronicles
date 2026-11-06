// Hub: the digital village. Walk around, talk to people, open the first puzzle.

import { buildMap } from './world.js';
import * as layer from '../ui/textLayer.js';
import * as input from '../systems/input.js';
import * as dialogue from '../systems/dialogue.js';
import * as puzzle from '../systems/puzzle.js';
import * as content from '../systems/content.js';
import * as achievements from '../systems/achievements.js';
import * as menus from '../ui/menus.js';
import { t, ui, forTier, getTier } from '../systems/i18n.js';
import { state, saveNow, playerName } from '../systems/state.js';

const SPEED = 72;
const FILE = 'hub';
const FACING = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] };

export default class Hub extends Phaser.Scene {
  constructor() { super('Hub'); }

  create() {
    const slot = state.slot;
    const { map, ground, structures, objects } = buildMap(this, 'hub');
    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

    // ----- player -----
    const spawn = objects.find((o) => o.type === 'spawn');
    const loc = slot.location || {};
    const px = loc.scene === 'Hub' && loc.x != null ? loc.x : spawn.x;
    const py = loc.scene === 'Hub' && loc.y != null ? loc.y : spawn.y;
    this.avatar = slot.avatar || 0;
    this.facing = loc.facing || 'down';
    this.player = this.physics.add.sprite(px, py, 'hero', this.avatar * 12);
    this.player.body.setSize(10, 7).setOffset(3, 9);
    this.player.setCollideWorldBounds(true);
    this.player.anims.play(`hero${this.avatar}-idle-${this.facing}`);
    this.physics.add.collider(this.player, [ground, structures]);

    // ----- people and things to talk to -----
    this.interactables = [];
    const npcGroup = this.physics.add.staticGroup();
    for (const o of objects) {
      if (o.type === 'npc') {
        const s = npcGroup.create(o.x, o.y, 'npcs', o.props.sprite * 2);
        s.body.setSize(12, 10).setOffset(2, 6);
        s.refreshBody();
        s.anims.play(`npc${o.props.sprite}-idle`);
        s.setDepth(o.y);
        this.interactables.push({ ...o, sprite: s });
      } else if (['sign', 'gate', 'talk'].includes(o.type)) {
        this.interactables.push(o);
      }
    }
    this.physics.add.collider(this.player, npcGroup);

    // ----- camera -----
    const cam = this.cameras.main;
    cam.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    cam.startFollow(this.player, true, 0.2, 0.2);
    cam.fadeIn(300);

    // ----- HTML layer: HUD and touch -----
    this.buildHud();
    layer.showTouch({ up: ui('touch.up'), down: ui('touch.down'), left: ui('touch.left'), right: ui('touch.right'), action: ui('touch.action') });

    // ----- input -----
    this.offAction = input.on('action', () => this.onAction());
    this.offCancel = input.on('cancel', () => { if (!layer.isBusy()) this.openPause(); });
    this.events.once('shutdown', () => this.cleanup());

    // ----- saving -----
    slot.location = { scene: 'Hub', x: this.player.x, y: this.player.y, facing: this.facing };
    saveNow();
    this.saveTimer = this.time.addEvent({ delay: 15000, loop: true, callback: () => this.savePosition() });
    this.onHide = () => { if (document.visibilityState === 'hidden') this.savePosition(); };
    document.addEventListener('visibilitychange', this.onHide);
    window.addEventListener('pagehide', this.onHide);

    // ----- first visit -----
    achievements.unlock(slot, 'first_steps') && saveNow();
    if (!slot.flags.met_guide) this.time.delayedCall(500, () => this.talk('hub_welcome'));

    // ----- test hooks (no personal data) -----
    window.DCC.debug.scene = 'Hub';
    window.DCC.debug.goTo = (name) => this.debugGoTo(name);
    window.DCC.debug.slot = () => JSON.parse(JSON.stringify(state.slot));
  }

  cleanup() {
    this.offAction && this.offAction();
    this.offCancel && this.offCancel();
    document.removeEventListener('visibilitychange', this.onHide);
    window.removeEventListener('pagehide', this.onHide);
    layer.placeMarker(null);
  }

  buildHud() {
    layer.setHud([
      layer.el('span', { class: 'place' }, ui('hub.place')),
      layer.el('button', { class: 'small', 'data-test': 'menu', 'aria-label': ui('pause.open'), onclick: () => this.openPause() }, '☰ ' + ui('pause.menu')),
    ]);
  }

  savePosition() {
    const slot = state.slot;
    if (!slot || !this.player) return;
    slot.location = { scene: 'Hub', x: Math.round(this.player.x), y: Math.round(this.player.y), facing: this.facing };
    saveNow();
  }

  update() {
    const p = this.player;
    if (!p || !p.body) return;
    if (layer.isBusy()) {
      p.setVelocity(0, 0);
      p.anims.play(`hero${this.avatar}-idle-${this.facing}`, true);
      layer.placeMarker(null);
      return;
    }
    const d = input.dir();
    let vx = d.x * SPEED, vy = d.y * SPEED;
    if (vx && vy) { vx *= Math.SQRT1_2; vy *= Math.SQRT1_2; }
    p.setVelocity(vx, vy);
    if (d.x || d.y) {
      // Face the way of the stronger key; horizontal wins ties so side-walking looks right.
      this.facing = d.x < 0 ? 'left' : d.x > 0 ? 'right' : d.y < 0 ? 'up' : 'down';
      p.anims.play(`hero${this.avatar}-walk-${this.facing}`, true);
    } else {
      p.anims.play(`hero${this.avatar}-idle-${this.facing}`, true);
    }
    p.setDepth(p.y);

    this.target = this.findTarget();
    if (this.target) {
      const cam = this.cameras.main;
      const tgt = this.target.type === 'talk' ? this.interactables.find((o) => o.name === this.target.props.target) : this.target;
      layer.placeMarker(tgt.x - cam.worldView.x, tgt.y - 9 - cam.worldView.y);
    } else {
      layer.placeMarker(null);
    }
  }

  /** The thing just in front of the player, if any. */
  findTarget() {
    const [fx, fy] = FACING[this.facing];
    const probeX = this.player.x + fx * 12;
    const probeY = this.player.y + 4 + fy * 12;
    let best = null, bestD = 11;
    for (const o of this.interactables) {
      const dist = Math.hypot(o.x - probeX, o.y - probeY);
      if (dist < bestD) { best = o; bestD = dist; }
    }
    return best;
  }

  onAction() {
    if (layer.isBusy() || !this.target) return;
    this.interact(this.target);
  }

  async interact(o) {
    const slot = state.slot;
    if (o.type === 'talk') o = this.interactables.find((x) => x.name === o.props.target);
    if (!o) return;
    if (o.type === 'npc') {
      const id = o.props.npc;
      slot.flags['talked_' + id] = true;
      await this.talk(dialogue.nodeFor(FILE, id, slot.flags));
      const npcs = Object.keys(content.get(FILE).npcs);
      if (npcs.every((n) => slot.flags['talked_' + n])) achievements.unlock(slot, 'meet_everyone');
    } else if (o.type === 'sign') {
      await this.talk(o.props.dialogue);
    } else if (o.type === 'gate') {
      const area = content.get('ui').areas[String(o.props.area)];
      await this.talk(o.props.open ? 'gate_open' : 'gate_closed', { area: t(area.title) });
    }
    saveNow();
  }

  talk(node, vars = {}) {
    if (!node) return Promise.resolve();
    input.clearHeld();
    return dialogue.run(FILE, node, {
      flags: state.slot.flags,
      vars: { name: playerName(), ...vars },
      startPuzzle: (id) => this.startPuzzle(id),
    });
  }

  /** Opens a puzzle by id or family (the version for the player's cycle) and records the result. */
  async startPuzzle(ref) {
    const slot = state.slot;
    const p = (content.get(FILE).puzzles || []).find((x) => (x.id === ref || x.family === ref) && forTier(x, getTier()));
    if (!p) { console.error('No puzzle for', ref, getTier()); return null; }
    const result = await puzzle.open(p);
    if (result.solved) {
      const prev = slot.puzzles[p.id];
      slot.puzzles[p.id] = { done: true, hints: (prev ? prev.hints : 0) + result.hints, at: new Date().toISOString() };
      slot.hints[p.element] = (slot.hints[p.element] || 0) + result.hints;
      if (p.flag) slot.flags[p.flag] = true;
      if (p.achievement) achievements.unlock(slot, p.achievement);
      saveNow();
    }
    return result;
  }

  // ----- pause menu and journal -----
  openPause() {
    if (layer.isBusy()) return;
    input.clearHeld();
    const close = () => layer.hidePanel();
    layer.showPanel(layer.el('section', { class: 'card', 'aria-label': ui('pause.menu') },
      layer.el('h2', {}, ui('pause.menu')),
      layer.el('div', { class: 'menu' },
        layer.el('button', { class: 'primary', onclick: close }, ui('pause.resume')),
        layer.el('button', { 'data-test': 'journal', onclick: () => this.openJournal() }, ui('journal.title')),
        layer.el('button', { onclick: () => menus.settingsPanel(() => { this.buildHud(); this.openPausePanelAgain(); }) }, ui('title.settings')),
        layer.el('button', { 'data-test': 'quit', onclick: () => this.quitToTitle() }, ui('pause.quit')))), { onCancel: close });
  }

  openPausePanelAgain() { layer.hidePanel(); this.openPause(); }

  openJournal() {
    const slot = state.slot;
    const got = achievements.listUnlocked(slot);
    const back = () => this.openPausePanelAgain();
    layer.showPanel(layer.el('section', { class: 'card', 'aria-label': ui('journal.title') },
      layer.el('h2', {}, ui('journal.title')),
      layer.el('div', { class: 'row', style: { justifyContent: 'flex-start' } },
        layer.el('span', { class: 'avatar', style: layer.avatarStyle(slot.avatar) }),
        layer.el('strong', {}, playerName()),
        layer.el('span', {}, slot.tier === 'E3' ? ui('cycle.c3') : ui('cycle.c2'))),
      layer.el('h3', { style: { margin: 0, fontSize: '1em' } }, ui('journal.achievements')),
      got.length
        ? layer.el('ul', { class: 'list' }, got.map((a) => layer.el('li', {}, layer.el('strong', {}, t(a.name)), ' · ', t(a.desc))))
        : layer.el('p', {}, ui('journal.empty')),
      layer.el('div', { class: 'actions' }, layer.el('button', { class: 'primary', onclick: back }, ui('common.back')))), { onCancel: back });
  }

  quitToTitle() {
    this.savePosition();
    layer.hidePanel();
    layer.placeMarker(null);
    layer.hideTouch();
    this.cameras.main.fadeOut(250);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Title'));
  }

  // ----- test helper: stand in front of a named object, facing it -----
  debugGoTo(name) {
    const o = this.interactables.find((x) => x.name === name);
    if (!o) return false;
    // Try below, above, left and right of the object; face towards it.
    const spots = [[0, 16, 'up'], [0, -16, 'down'], [-16, 0, 'right'], [16, 0, 'left']];
    for (const [dx, dy, facing] of spots) {
      const x = o.x + dx, y = o.y + dy - 4;
      if (this.isFree(x, y + 4)) {
        this.player.setPosition(x, y);
        this.facing = facing;
        return true;
      }
    }
    return false;
  }

  isFree(x, y) {
    const layers = this.children.list.filter((c) => c.type === 'TilemapLayer');
    return layers.every((l) => {
      const tile = l.getTileAtWorldXY(x, y);
      return !tile || !tile.collides;
    });
  }
}
