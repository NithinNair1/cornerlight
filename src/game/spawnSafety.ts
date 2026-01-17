import { TileType, Vec2 } from './types';

function isClear3x3(grid: TileType[][], tileX: number, tileY: number): boolean {
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const x = tileX + dx;
      const y = tileY + dy;
      if (y < 0 || y >= grid.length || x < 0 || x >= grid[0].length) return false;
      if (grid[y][x] === TileType.WALL) return false;
    }
  }
  return true;
}

function isWalkableTile(grid: TileType[][], tileX: number, tileY: number): boolean {
  if (tileY < 0 || tileY >= grid.length || tileX < 0 || tileX >= grid[0].length) return false;
  return grid[tileY][tileX] !== TileType.WALL;
}

/**
 * Returns a safe position centered in a tile.
 * - Prefers the requested position's tile.
 * - Falls back to nearest tile (BFS) that is walkable and (optionally) has a clear 3x3 around it.
 */
export function findSafeSpawnPos(
  grid: TileType[][],
  preferredPos: Vec2,
  options?: { requireClear3x3?: boolean; maxSearchRadiusTiles?: number }
): Vec2 {
  const requireClear3x3 = options?.requireClear3x3 ?? true;
  const maxR = options?.maxSearchRadiusTiles ?? 30;

  const start = { x: Math.floor(preferredPos.x), y: Math.floor(preferredPos.y) };

  const width = grid[0]?.length ?? 0;
  const height = grid.length;

  const inBounds = (x: number, y: number) => x >= 0 && x < width && y >= 0 && y < height;
  const ok = (x: number, y: number) => {
    if (!inBounds(x, y)) return false;
    if (!isWalkableTile(grid, x, y)) return false;
    return requireClear3x3 ? isClear3x3(grid, x, y) : true;
  };

  if (ok(start.x, start.y)) {
    return { x: start.x + 0.5, y: start.y + 0.5 };
  }

  const visited = new Set<string>();
  const q: Array<{ x: number; y: number; d: number }> = [{ x: start.x, y: start.y, d: 0 }];
  visited.add(`${start.x},${start.y}`);

  const dirs = [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
  ];

  while (q.length) {
    const cur = q.shift()!;
    if (cur.d > maxR) break;

    if (ok(cur.x, cur.y)) {
      return { x: cur.x + 0.5, y: cur.y + 0.5 };
    }

    for (const dir of dirs) {
      const nx = cur.x + dir.x;
      const ny = cur.y + dir.y;
      const key = `${nx},${ny}`;
      if (!inBounds(nx, ny) || visited.has(key)) continue;
      visited.add(key);
      q.push({ x: nx, y: ny, d: cur.d + 1 });
    }
  }

  // Absolute fallback: find any walkable tile.
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (ok(x, y)) return { x: x + 0.5, y: y + 0.5 };
    }
  }

  return { x: 1.5, y: 1.5 };
}

/** Ensures a generic entity isn't inside a wall; does NOT require 3x3 clearance. */
export function findSafeEntityPos(grid: TileType[][], preferredPos: Vec2): Vec2 {
  return findSafeSpawnPos(grid, preferredPos, { requireClear3x3: false, maxSearchRadiusTiles: 30 });
}
