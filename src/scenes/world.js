// Builds a Tiled map into a scene: ground and structure layers, collisions, and the object list.

export function buildMap(scene, key) {
  const map = scene.make.tilemap({ key });
  const tiles = map.addTilesetImage('village', 'tiles');
  const ground = map.createLayer('ground', tiles, 0, 0);
  const structures = map.createLayer('structures', tiles, 0, 0);
  ground.setCollisionByProperty({ collides: true });
  structures.setCollisionByProperty({ collides: true });

  const objects = (map.getObjectLayer('objects') || { objects: [] }).objects.map((o) => {
    const props = {};
    for (const p of o.properties || []) props[p.name] = p.value;
    return { name: o.name, type: o.type || o.class, x: o.x, y: o.y, props };
  });
  return { map, ground, structures, objects };
}
