// Tap-to-move: finds a walking route on the tile grid.
// Plain functions, no Phaser, so the route finder can be tested on its own.
//
// findPath({ width, height, start: [tx, ty], goals: Set of "tx,ty", blocked(tx, ty), extraCost(tx, ty) })
//   -> [[tx, ty], ...] the tiles to walk through (not including the start), or null if no way.
// Moves in 8 directions; a diagonal step is only taken when both side tiles are free,
// so the hero never clips a wall corner.

const DIRS = [
  [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
  [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2],
];

export const key = (x, y) => x + ',' + y;

export function findPath({ width, height, start, goals, blocked, extraCost = () => 0, maxNodes = 6000 }) {
  if (!goals || !goals.size) return null;
  const [sx, sy] = start;
  if (goals.has(key(sx, sy))) return [];
  const goalList = [...goals].map((k) => k.split(',').map(Number));
  // Octile distance to the nearest goal: never more than the real cost, so the route is the shortest.
  const h = (x, y) => {
    let best = Infinity;
    for (const [gx, gy] of goalList) {
      const dx = Math.abs(gx - x), dy = Math.abs(gy - y);
      const d = Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy);
      if (d < best) best = d;
    }
    return best;
  };
  const free = (x, y) => x >= 0 && y >= 0 && x < width && y < height && !blocked(x, y);

  const g = new Map([[key(sx, sy), 0]]);
  const from = new Map();
  const open = [{ x: sx, y: sy, f: h(sx, sy) }];
  const closed = new Set();
  let visited = 0;
  while (open.length && visited < maxNodes) {
    // The open list stays small on these maps, so a simple scan is fast enough.
    let bi = 0;
    for (let i = 1; i < open.length; i++) if (open[i].f < open[bi].f) bi = i;
    const cur = open[bi];
    open[bi] = open[open.length - 1];
    open.pop();
    const ck = key(cur.x, cur.y);
    if (closed.has(ck)) continue;
    closed.add(ck);
    visited++;
    if (goals.has(ck)) {
      const path = [];
      let k = ck;
      while (k !== key(sx, sy)) { path.push(k.split(',').map(Number)); k = from.get(k); }
      return path.reverse();
    }
    for (const [dx, dy, cost] of DIRS) {
      const nx = cur.x + dx, ny = cur.y + dy;
      const nk = key(nx, ny);
      if (closed.has(nk) || !free(nx, ny)) continue;
      if (dx && dy && (!free(cur.x + dx, cur.y) || !free(cur.x, cur.y + dy))) continue;
      const ng = g.get(ck) + cost + (goals.has(nk) ? 0 : extraCost(nx, ny));
      if (ng < (g.has(nk) ? g.get(nk) : Infinity)) {
        g.set(nk, ng);
        from.set(nk, ck);
        open.push({ x: nx, y: ny, f: ng + h(nx, ny) });
      }
    }
  }
  return null;
}

/**
 * The free tiles closest to a tile (itself if free), for taps on a wall, water or a tree.
 * Looks in growing rings up to `radius` tiles away.
 */
export function nearestFree(tx, ty, blocked, radius = 3) {
  if (!blocked(tx, ty)) return [[tx, ty]];
  for (let r = 1; r <= radius; r++) {
    const ring = [];
    for (let y = ty - r; y <= ty + r; y++) {
      for (let x = tx - r; x <= tx + r; x++) {
        if (Math.max(Math.abs(x - tx), Math.abs(y - ty)) === r && !blocked(x, y)) ring.push([x, y]);
      }
    }
    if (ring.length) return ring;
  }
  return [];
}
