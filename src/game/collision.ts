import { Vec2, TileType, GameConfig } from './types';
import { getLinePoints } from './utils';

export function isWalkable(
  grid: TileType[][],
  x: number,
  y: number
): boolean {
  const tileX = Math.floor(x);
  const tileY = Math.floor(y);

  if (
    tileY < 0 ||
    tileY >= grid.length ||
    tileX < 0 ||
    tileX >= grid[0].length
  ) {
    return false;
  }

  const tile = grid[tileY][tileX];
  return tile !== TileType.WALL;
}

export function canMoveTo(
  grid: TileType[][],
  from: Vec2,
  to: Vec2,
  radius: number = 0.3
): boolean {
  // Check corners of bounding box
  const offsets = [
    { x: -radius, y: -radius },
    { x: radius, y: -radius },
    { x: -radius, y: radius },
    { x: radius, y: radius },
  ];

  for (const offset of offsets) {
    if (!isWalkable(grid, to.x + offset.x, to.y + offset.y)) {
      return false;
    }
  }

  return true;
}

export function hasLineOfSight(
  grid: TileType[][],
  from: Vec2,
  to: Vec2
): boolean {
  const fromTile = { x: Math.floor(from.x), y: Math.floor(from.y) };
  const toTile = { x: Math.floor(to.x), y: Math.floor(to.y) };

  const points = getLinePoints(fromTile.x, fromTile.y, toTile.x, toTile.y);

  for (let i = 1; i < points.length - 1; i++) {
    const point = points[i];
    if (
      point.y >= 0 &&
      point.y < grid.length &&
      point.x >= 0 &&
      point.x < grid[0].length
    ) {
      const tile = grid[point.y][point.x];
      if (tile === TileType.WALL || tile === TileType.COVER) {
        return false;
      }
    }
  }

  return true;
}

export function resolveCollision(
  grid: TileType[][],
  from: Vec2,
  to: Vec2,
  radius: number = 0.3
): Vec2 {
  // Try full movement
  if (canMoveTo(grid, from, to, radius)) {
    return to;
  }

  // Try horizontal only
  const horizontalOnly = { x: to.x, y: from.y };
  if (canMoveTo(grid, from, horizontalOnly, radius)) {
    return horizontalOnly;
  }

  // Try vertical only
  const verticalOnly = { x: from.x, y: to.y };
  if (canMoveTo(grid, from, verticalOnly, radius)) {
    return verticalOnly;
  }

  // Can't move
  return from;
}
