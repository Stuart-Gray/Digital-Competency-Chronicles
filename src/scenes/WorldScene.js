// World: what every walkable place shares (the village and each dungeon).
// Walking, talking, signs, gates, doors, chests, key stones, the lantern, saving,
// the pause menu and the journal. A place is a Tiled map plus a content file.
//
// Map objects (layer "objects"), see docs/content-schema.md:
//   spawn    a place to start (name it, e.g. "from_village")
//   npc      a person: npc (id in content), sprite (row in npcs.png)
//   sign     something to read: dialogue (node id)
//   gate     a gate to a content area: area, open, dialogue (node, optional)
//   talk     talking here talks to the target (across a counter)
//   door     a door on the map: flag (opens when set; "a,b" = all of them), w, h, dialogue (when closed)
//   chest    flag (set when opened), dialogue (node with a "give:" action)
//   keystone a floor stone: group, order (1, 2, 3...), flag (set when the group is done)
//   trace    a glowing trace only the lantern shows: fx (frame in fx.png)
//   exit     walking onto it travels: to (scene), spawn (spawn name there)
//   deco     changes a tile when a flag is set: tile, layer, ifFlag
// Any object can have ifFlag / ifNotFlag (only there when a flag is / is not set)
// and lantern (only seen and used in lantern light).

import { buildMap } from './world.js';
import * as layer from '../ui/textLayer.js';
import * as input from '../systems/input.js';
import * as dialogue from '../systems/dialogue.js';
import * as puzzle from '../systems/puzzle.js';
import * as content from '../systems/content.js';
import * as achievements from '../systems/achievements.js';
import * as menus from '../ui/menus.js';
import { fxStyle } from '../ui/art.js';
import { t, ui, forTier, getTier } from '../systems/i18n.js';
import { state, saveNow, playerName } from '../systems/state.js';
import * as music from '../systems/music.js';

const SPEED = 72;
const FACING = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] };
const T = 16;
const LIGHT_SMALL = 30;   // light around the player without the lantern
const LIGHT_LANTERN = 64; // with the lantern; lantern-only things show inside this circle

/** Where an object is drawn and reached: wide or tall things (doors) use their bottom-middle tile. */
function center(o) {
  return { x: o.x + ((o.props.w || 1) - 1) * T / 2, y: o.y + ((o.props.h || 1) - 1) * T };
}

export default class World extends Phaser.Scene {
  /**
   * opts = { file: content file, map: tilemap key, tileset: [name in map, texture key],
   *          place: ui string for the HUD, dark: draw darkness and light,
   *          music: song id from content/music.json }
   */
  constructor(key, opts) {
    super(key);
    this.opts = opts;
  }

  init(data) {
    this.arrival = data || {};
    // Phaser reuses one scene object for every visit, so per-visit state must be reset here.
    // (Leaving the village set travelling = true, and it stayed true when the player came back.)
    this.travelling = false;
    this.target = null;
    this.onExit = null;
    this.onStone = undefined;
  }

  get FILE() { return this.opts.file; }

  create() {
    const slot = state.slot;
    music.play(this.opts.music);
    const { map, ground, structures, objects } = buildMap(this, this.opts.map, this.opts.tileset);
    this.map = map;
    this.layers = { ground, structures };
    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.objects = objects;

    // ----- player -----
    const loc = slot.location || {};
    let start = null;
    if (this.arrival.spawn) start = objects.find((o) => o.type === 'spawn' && o.name === this.arrival.spawn);
    if (!start && loc.scene === this.scene.key && loc.x != null) start = { x: loc.x, y: loc.y, props: { facing: loc.facing } };
    if (!start) start = objects.find((o) => o.type === 'spawn');
    this.avatar = slot.avatar || 0;
    this.facing = (start.props && start.props.facing) || loc.facing || 'down';
    this.player = this.physics.add.sprite(start.x, start.y, 'hero', this.avatar * 12);
    this.player.body.setSize(10, 7).setOffset(3, 9);
    this.player.setCollideWorldBounds(true);
    this.player.anims.play(`hero${this.avatar}-idle-${this.facing}`);
    this.physics.add.collider(this.player, [ground, structures]);

    // ----- people and things -----
    this.interactables = [];
    this.npcGroup = this.physics.add.staticGroup();
    for (const o of objects) {
      if (o.type === 'npc') {
        const s = this.npcGroup.create(o.x, o.y, 'npcs', o.props.sprite * 2);
        s.body.setSize(12, 10).setOffset(2, 6);
        s.refreshBody();
        s.anims.play(`npc${o.props.sprite}-idle`);
        s.setDepth(o.y);
        o.sprite = s;
      } else if (o.type === 'trace' || (o.props.fx != null && o.type !== 'keystone')) {
        const c = center(o);
        o.sprite = this.add.image(c.x, c.y, 'fx', o.props.fx).setDepth(o.type === 'trace' ? 1 : c.y + 8);
      }
      if (['npc', 'sign', 'gate', 'talk', 'door', 'chest'].includes(o.type)) this.interactables.push(o);
    }
    this.physics.add.collider(this.player, this.npcGroup);
    this.keystones = objects.filter((o) => o.type === 'keystone');
    this.exits = objects.filter((o) => o.type === 'exit');
    this.onExit = this.exitAt(this.player.x, this.player.y); // don't leave right after arriving

    // ----- light -----
    if (this.opts.dark) this.makeDarkness();

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
    this.savePosition();
    this.saveTimer = this.time.addEvent({ delay: 15000, loop: true, callback: () => this.savePosition() });
    this.onHide = () => { if (document.visibilityState === 'hidden') this.savePosition(); };
    document.addEventListener('visibilitychange', this.onHide);
    window.addEventListener('pagehide', this.onHide);

    this.refresh();
    this.busyUntil = 0;

    // ----- test hooks (no personal data) -----
    window.DCC.debug.scene = this.scene.key;
    window.DCC.debug.goTo = (name) => this.debugGoTo(name);
    window.DCC.debug.slot = () => JSON.parse(JSON.stringify(state.slot));
    window.DCC.debug.flags = () => ({ ...state.slot.flags });
    window.DCC.debug.walkTo = (name) => this.debugWalkTo(name);
    window.DCC.debug.pos = () => ({ x: Math.round(this.player.x), y: Math.round(this.player.y) });

    this.onArrive();
  }

  /** Subclasses: what happens when the player arrives (first-visit talks, achievements). */
  onArrive() {}

  cleanup() {
    this.offAction && this.offAction();
    this.offCancel && this.offCancel();
    document.removeEventListener('visibilitychange', this.onHide);
    window.removeEventListener('pagehide', this.onHide);
    layer.placeMarker(null);
  }

  buildHud() {
    const slot = state.slot;
    const items = (slot.items || []).map((id) => this.itemDef(id)).filter((d) => d && d.fx != null && d.hud !== false);
    layer.setHud([
      layer.el('span', { class: 'place' }, ui(this.opts.place)),
      layer.el('span', { class: 'hud-right' },
        items.length ? layer.el('span', { class: 'hud-items', 'aria-label': ui('journal.items') },
          items.map((d) => layer.el('span', { class: 'fx', title: t(d.name), style: fxStyle(d.fx) }))) : null,
        layer.el('button', { class: 'small', 'data-test': 'menu', 'aria-label': ui('pause.open'), onclick: () => this.openPause() }, '☰ ' + ui('pause.menu'))),
    ]);
  }

  savePosition() {
    const slot = state.slot;
    if (!slot || !this.player) return;
    slot.location = { scene: this.scene.key, x: Math.round(this.player.x), y: Math.round(this.player.y), facing: this.facing };
    saveNow();
  }

  // ---------- flags, conditions and the things that depend on them ----------
  flagOn(spec) {
    if (!spec) return true;
    return String(spec).split(',').every((f) => state.slot.flags[f.trim()]);
  }

  present(o) {
    const p = o.props;
    if (p.ifFlag && !this.flagOn(p.ifFlag)) return false;
    if (p.ifNotFlag && this.flagOn(p.ifNotFlag)) return false;
    return true;
  }

  hasLantern() { return (state.slot.items || []).includes('lantern'); }

  /** Inside the lantern's light right now? */
  lit(o) {
    if (!o.props.lantern) return true;
    if (!this.hasLantern()) return false;
    const c = center(o);
    return Math.hypot(c.x - this.player.x, c.y - this.player.y) < LIGHT_LANTERN - 6;
  }

  /** Re-applies every flag-dependent thing: doors, chests, people, decorations. */
  refresh() {
    const S = this.layers.structures, G = this.layers.ground;
    for (const o of this.objects) {
      const here = this.present(o);
      o.active = here;
      if (o.sprite) {
        o.sprite.setVisible(here && !o.props.lantern);
        if (o.sprite.body) o.sprite.body.enable = here;
      }
      const tx = Math.floor(o.x / T), ty = Math.floor(o.y / T);
      if (o.type === 'door') {
        const open = this.flagOn(o.props.flag);
        o.active = here && !open;
        const w = o.props.w || 1, h = o.props.h || 1;
        for (let dy = 0; dy < h; dy++) {
          for (let dx = 0; dx < w; dx++) {
            const closedTile = dy === h - 1 ? (o.props.closed ?? 6) : (o.props.closedTop ?? 3);
            this.setTile(S, tx + dx, ty + dy, open ? (o.props.openTile ?? 7) : closedTile);
          }
        }
      } else if (o.type === 'chest') {
        this.setTile(S, tx, ty, here ? (state.slot.flags[o.props.flag] ? 16 : 15) : -1);
      } else if (o.type === 'keystone') {
        const pressed = this.flagOn(o.props.flag) || (this.pressed && this.pressed[o.props.group] && this.pressed[o.props.group].includes(o));
        this.setTile(G, tx, ty, pressed ? 11 : 10);
      } else if (o.type === 'deco' && here) {
        this.setTile(o.props.layer === 'ground' ? G : S, tx, ty, o.props.tile);
      }
    }
    this.buildHud();
  }

  setTile(tl, tx, ty, index) {
    if (index < 0) { tl.removeTileAt(tx, ty); return; }
    const tile = tl.putTileAt(index + 1, tx, ty); // +1: Tiled gids start at 1
    // Colliding comes from the tileset's "collides" property.
    const props = tl.tileset[0].getTileProperties(index + 1);
    if (tile) tile.setCollision(!!(props && props.collides));
  }

  // ---------- darkness and the lantern's light ----------
  makeDarkness() {
    const { width, height } = this.scale;
    const make = (key, r) => {
      if (this.textures.exists(key)) return;
      const w = width * 2, h = height * 2;
      const tex = this.textures.createCanvas(key, w, h);
      const ctx = tex.getContext();
      ctx.fillStyle = 'rgba(10,8,20,0.82)';
      ctx.fillRect(0, 0, w, h);
      const g = ctx.createRadialGradient(w / 2, h / 2, r * 0.35, w / 2, h / 2, r);
      g.addColorStop(0, 'rgba(0,0,0,1)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(w / 2, h / 2, r, 0, Math.PI * 2); ctx.fill();
      tex.refresh();
    };
    make('dark-small', LIGHT_SMALL);
    make('dark-lantern', LIGHT_LANTERN);
    this.dark = this.add.image(0, 0, 'dark-small').setScrollFactor(0).setDepth(10000);
    // A warm tint inside the lantern circle
    this.glow = this.add.circle(0, 0, LIGHT_LANTERN - 8, 0xffe680, 0.08).setDepth(9999).setVisible(false);
  }

  updateLight() {
    if (!this.dark) return;
    const lantern = this.hasLantern();
    this.dark.setTexture(lantern ? 'dark-lantern' : 'dark-small');
    const cam = this.cameras.main;
    this.dark.setPosition(this.player.x - cam.worldView.x, this.player.y - cam.worldView.y);
    this.glow.setVisible(lantern).setPosition(this.player.x, this.player.y);
    for (const o of this.objects) {
      if (!o.props.lantern || !o.sprite) continue;
      const show = o.active && this.lit(o);
      o.sprite.setVisible(show);
      if (show) o.sprite.setAlpha(0.75 + 0.25 * Math.sin(this.time.now / 250));
    }
  }

  // ---------- each frame ----------
  update() {
    const p = this.player;
    if (!p || !p.body) return;
    this.updateLight();
    this.updateBubble();
    if (layer.isBusy() || this.travelling) {
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
      this.facing = d.x < 0 ? 'left' : d.x > 0 ? 'right' : d.y < 0 ? 'up' : 'down';
      p.anims.play(`hero${this.avatar}-walk-${this.facing}`, true);
    } else {
      p.anims.play(`hero${this.avatar}-idle-${this.facing}`, true);
    }
    p.setDepth(p.y);

    this.checkFloor();

    this.target = this.findTarget();
    if (this.target) {
      const cam = this.cameras.main;
      const tgt = center(this.target.type === 'talk' ? this.interactables.find((o) => o.name === this.target.props.target) : this.target);
      layer.placeMarker(tgt.x - cam.worldView.x, tgt.y - 9 - cam.worldView.y);
    } else {
      layer.placeMarker(null);
    }
  }

  /** A speech bubble over whoever is talking, so players can see which character it is. */
  updateBubble() {
    const who = layer.currentSpeaker();
    const s = who && this.speakerSprite(who);
    if (!s) { layer.placeBubble(null); return; }
    const cam = this.cameras.main;
    const x = s.x - cam.worldView.x, y = s.y - 10 - cam.worldView.y;
    if (x < 0 || x > cam.width || y < 0 || y > cam.height) { layer.placeBubble(null); return; }
    layer.placeBubble(x, y);
  }

  /** The sprite of an npc in this place (the nearest one, if the map has them twice). */
  speakerSprite(npcId) {
    let best = null, bestD = Infinity;
    for (const o of this.objects) {
      if (o.type !== 'npc' || o.props.npc !== npcId || !o.sprite || !o.sprite.visible || !this.present(o)) continue;
      const d = Phaser.Math.Distance.Between(o.x, o.y, this.player.x, this.player.y);
      if (d < bestD) { best = o.sprite; bestD = d; }
    }
    return best;
  }

  /** Key stones and exits react to where the player's feet are. */
  checkFloor() {
    const fx = this.player.x, fy = this.player.y + 5;
    const ex = this.exitAt(fx, fy - 5);
    if (ex && ex !== this.onExit && this.present(ex)) { this.onExit = ex; this.travel(ex.props.to, ex.props.spawn); return; }
    if (!ex) this.onExit = null;

    const tx = Math.floor(fx / T), ty = Math.floor(fy / T);
    const stone = this.keystones.find((k) => Math.floor(k.x / T) === tx && Math.floor(k.y / T) === ty);
    if (stone !== this.onStone) {
      this.onStone = stone;
      if (stone) this.stepOnStone(stone);
    }
  }

  exitAt(x, y) {
    const tx = Math.floor(x / T), ty = Math.floor((y + 5) / T);
    return this.exits.find((e) => Math.floor(e.x / T) === tx && Math.floor(e.y / T) === ty);
  }

  async stepOnStone(stone) {
    const p = stone.props;
    if (!this.present(stone) || this.flagOn(p.flag)) return;
    this.pressed = this.pressed || {};
    const list = this.pressed[p.group] = this.pressed[p.group] || [];
    if (list.includes(stone)) return;
    list.push(stone);
    const group = this.keystones.filter((k) => k.props.group === p.group);
    const right = list.every((k, i) => k.props.order === i + 1);
    this.refresh();
    if (!right) {
      // Gently pop the stones back up; nothing is lost.
      this.pressed[p.group] = [];
      this.time.delayedCall(350, () => this.refresh());
      if (p.resetDialogue) await this.talk(p.resetDialogue);
    } else if (list.length === group.length) {
      state.slot.flags[p.flag] = true;
      saveNow();
      this.cameras.main.shake(250, 0.004);
      this.refresh();
      if (p.doneDialogue) await this.talk(p.doneDialogue);
    }
  }

  /** The thing just in front of the player, if any. */
  findTarget() {
    const [fx, fy] = FACING[this.facing];
    const probeX = this.player.x + fx * 12;
    const probeY = this.player.y + 4 + fy * 12;
    let best = null, bestD = 11;
    for (const o of this.interactables) {
      if (o.active === false || !this.lit(o)) continue;
      // Wide things (doors) can be reached anywhere along them.
      const { x: ox, y: oy } = center(o);
      const dist = Math.hypot(ox - probeX, oy - probeY);
      if (dist < bestD + ((o.props.w || 1) - 1) * 8) { best = o; bestD = dist; }
    }
    return best;
  }

  onAction() {
    if (layer.isBusy() || !this.target || this.travelling) return;
    this.interact(this.target);
  }

  async interact(o) {
    const slot = state.slot;
    if (o.type === 'talk') o = this.interactables.find((x) => x.name === o.props.target && x.active !== false);
    if (!o) return;
    if (o.type === 'npc') {
      const id = o.props.npc;
      slot.flags['talked_' + id] = true;
      await this.talk(dialogue.nodeFor(this.FILE, id, slot.flags));
      this.afterTalk(id);
    } else if (o.type === 'sign' || o.type === 'door') {
      await this.talk(o.props.dialogue);
    } else if (o.type === 'gate') {
      const area = content.get('ui').areas[String(o.props.area)];
      await this.talk(o.props.dialogue || (o.props.open ? 'gate_open' : 'gate_closed'), { area: t(area.title) });
    } else if (o.type === 'chest') {
      if (slot.flags[o.props.flag]) await this.say(ui('world.chestEmpty'));
      else {
        slot.flags[o.props.flag] = true;
        this.refresh();
        this.sparkle(o.x, o.y - 8);
        await this.talk(o.props.dialogue);
      }
    }
    this.refresh();
    saveNow();
  }

  /** Subclasses can react after talking to someone. */
  afterTalk() {}

  async say(text) {
    await layer.say({ text });
    layer.closeDialogue();
  }

  talk(node, vars = {}) {
    if (!node) return Promise.resolve();
    input.clearHeld();
    return dialogue.run(this.FILE, node, {
      flags: state.slot.flags,
      vars: { name: playerName(), ...vars },
      startPuzzle: (id) => this.startPuzzle(id),
      give: (id) => this.give(id),
      achieve: (id) => { achievements.unlock(state.slot, id); saveNow(); },
      travel: (scene, spawn) => this.travel(scene, spawn),
      changed: () => this.refresh(),
    });
  }

  // ---------- items, pieces and badges ----------
  itemDef(id) {
    for (const f of content.CONTENT_FILES) {
      const items = content.get(f) && content.get(f).items;
      if (items && items[id]) return items[id];
    }
    return null;
  }

  give(id) {
    const slot = state.slot;
    slot.items = slot.items || [];
    if (slot.items.includes(id)) return;
    const def = this.itemDef(id);
    if (!def) { console.error('Unknown item', id); return; }
    slot.items.push(id);
    slot.flags['got_' + id] = true;
    layer.toast(ui(def.kind === 'badge' ? 'journal.gotBadge' : def.kind === 'piece' ? 'journal.gotPiece' : 'journal.gotItem'), t(def.name));
    this.sparkle(this.player.x, this.player.y - 14);
    if (def.achievement) achievements.unlock(slot, def.achievement);
    // A wing finished without any hint earns a quiet extra achievement.
    if (def.wing && def.wing.every((fam) => this.puzzleDone(fam) && this.puzzleHints(fam) === 0)) achievements.unlock(slot, 'clear_thinker');
    saveNow();
    this.buildHud();
  }

  sparkle(x, y) {
    const s = this.add.image(x, y, 'fx', 5).setDepth(20000);
    this.tweens.add({ targets: s, y: y - 10, alpha: 0, scale: 2, duration: 700, onComplete: () => s.destroy() });
  }

  findPuzzle(ref) {
    return (content.get(this.FILE).puzzles || []).find((x) => (x.id === ref || x.family === ref) && forTier(x, getTier()));
  }

  puzzleDone(ref) { const p = this.findPuzzle(ref); return !!(p && state.slot.puzzles[p.id]); }
  puzzleHints(ref) { const p = this.findPuzzle(ref); return p && state.slot.puzzles[p.id] ? state.slot.puzzles[p.id].hints : 0; }

  /** Opens a puzzle by id or family (the version for the player's cycle) and records the result. */
  async startPuzzle(ref) {
    const slot = state.slot;
    const p = this.findPuzzle(ref);
    if (!p) { console.error('No puzzle for', ref, getTier()); return null; }
    const result = await puzzle.open(p);
    if (result.solved) {
      const prev = slot.puzzles[p.id];
      slot.puzzles[p.id] = { done: true, hints: (prev ? prev.hints : 0) + result.hints, at: new Date().toISOString() };
      slot.hints[p.element] = (slot.hints[p.element] || 0) + result.hints;
      if (p.flag) slot.flags[p.flag] = true;
      if (p.achievement) achievements.unlock(slot, p.achievement);
      saveNow();
      this.refresh();
    } else if (result.hints) {
      // Hints used before leaving still count quietly for the teacher view.
      slot.hints[p.element] = (slot.hints[p.element] || 0) + result.hints;
      saveNow();
    }
    return result;
  }

  // ---------- travel between places ----------
  travel(scene, spawn) {
    if (this.travelling) return;
    this.travelling = true;
    const slot = state.slot;
    slot.location = { scene, spawn, x: null, y: null, facing: 'down' };
    saveNow();
    layer.closeDialogue();
    layer.placeMarker(null);
    input.clearHeld();
    this.cameras.main.fadeOut(300);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(scene, { spawn }));
  }

  // ---------- pause menu and journal ----------
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
    const items = (slot.items || []).map((id) => ({ id, ...this.itemDef(id) })).filter((d) => d.name);
    const back = () => this.openPausePanelAgain();
    layer.showPanel(layer.el('section', { class: 'card journal', 'aria-label': ui('journal.title') },
      layer.el('h2', {}, ui('journal.title')),
      layer.el('div', { class: 'row', style: { justifyContent: 'flex-start' } },
        layer.el('span', { class: 'avatar', style: layer.avatarStyle(slot.avatar) }),
        layer.el('strong', {}, playerName()),
        layer.el('span', {}, slot.tier === 'E3' ? ui('cycle.c3') : ui('cycle.c2'))),
      items.length ? [
        layer.el('h3', {}, ui('journal.items')),
        layer.el('ul', { class: 'list items' }, items.map((d) => layer.el('li', {},
          layer.el('span', { class: 'fx', style: fxStyle(d.fx) }), layer.el('span', {}, layer.el('strong', {}, t(d.name)), ' · ', t(d.desc))))),
      ] : null,
      layer.el('h3', {}, ui('journal.achievements')),
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

  // ---------- test helpers: stand in front of a named object, facing it ----------
  debugGoTo(name) {
    const o = this.objects.find((x) => x.name === name && x.active !== false) || this.objects.find((x) => x.name === name);
    if (!o) return false;
    const c = center(o);
    const spots = [[0, 16, 'up'], [0, -16, 'down'], [-16, 0, 'right'], [16, 0, 'left']];
    for (const [dx, dy, facing] of spots) {
      const x = c.x + dx, y = c.y + dy - 4;
      if (this.isFree(x, y + 4)) {
        this.player.setPosition(x, y);
        this.facing = facing;
        this.onStone = undefined;
        return true;
      }
    }
    return false;
  }

  /** Puts the player right on top of an object (key stones, exits). */
  debugWalkTo(name) {
    const o = this.objects.find((x) => x.name === name);
    if (!o) return false;
    this.player.setPosition(o.x, o.y - 5);
    return true;
  }

  isFree(x, y) {
    return [this.layers.ground, this.layers.structures].every((l) => {
      const tile = l.getTileAtWorldXY(x, y);
      return !tile || !tile.collides;
    });
  }
}
