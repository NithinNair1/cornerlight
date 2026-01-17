import { TileType, Vec2, Enemy, EnemyState, GameConfig, AmmoPickup } from './types';
import { SeededRandom, distance } from './utils';
import { COMBAT_CONFIG } from './config';

interface Room {
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

export function generateLevel(config: GameConfig): {
  grid: TileType[][];
  spawnPos: Vec2;
  exitPos: Vec2;
  enemies: Enemy[];
  ammoPickups: AmmoPickup[];
} {
  const rng = new SeededRandom(config.seed);
  const { gridWidth, gridHeight } = config;

  // Initialize grid with walls
  const grid: TileType[][] = Array(gridHeight)
    .fill(null)
    .map(() => Array(gridWidth).fill(TileType.WALL));

  // Generate rooms using BSP
  const rooms: Room[] = [];
  const minRoomSize = 4;
  const maxRoomSize = 8;

  // Create rooms
  const numRooms = rng.nextInt(6, 10);
  for (let i = 0; i < numRooms * 3; i++) {
    if (rooms.length >= numRooms) break;

    const width = rng.nextInt(minRoomSize, maxRoomSize);
    const height = rng.nextInt(minRoomSize, maxRoomSize);
    const x = rng.nextInt(1, gridWidth - width - 1);
    const y = rng.nextInt(1, gridHeight - height - 1);

    const newRoom: Room = {
      x,
      y,
      width,
      height,
      centerX: Math.floor(x + width / 2),
      centerY: Math.floor(y + height / 2),
    };

    // Check for overlap
    let overlaps = false;
    for (const room of rooms) {
      if (
        newRoom.x < room.x + room.width + 1 &&
        newRoom.x + newRoom.width + 1 > room.x &&
        newRoom.y < room.y + room.height + 1 &&
        newRoom.y + newRoom.height + 1 > room.y
      ) {
        overlaps = true;
        break;
      }
    }

    if (!overlaps) {
      rooms.push(newRoom);
    }
  }

  // Carve rooms
  for (const room of rooms) {
    for (let y = room.y; y < room.y + room.height; y++) {
      for (let x = room.x; x < room.x + room.width; x++) {
        grid[y][x] = TileType.FLOOR;
      }
    }
  }

  // Connect rooms with corridors
  for (let i = 1; i < rooms.length; i++) {
    const prev = rooms[i - 1];
    const curr = rooms[i];

    // Randomly choose horizontal-first or vertical-first
    if (rng.next() > 0.5) {
      carveHorizontalCorridor(grid, prev.centerX, curr.centerX, prev.centerY);
      carveVerticalCorridor(grid, prev.centerY, curr.centerY, curr.centerX);
    } else {
      carveVerticalCorridor(grid, prev.centerY, curr.centerY, prev.centerX);
      carveHorizontalCorridor(grid, prev.centerX, curr.centerX, curr.centerY);
    }
  }

  // Add some cover objects
  const coverCount = rng.nextInt(5, 12);
  for (let i = 0; i < coverCount; i++) {
    const x = rng.nextInt(2, gridWidth - 3);
    const y = rng.nextInt(2, gridHeight - 3);
    if (grid[y][x] === TileType.FLOOR) {
      grid[y][x] = TileType.COVER;
    }
  }

  const clear3x3 = (cx: number, cy: number, tileType: TileType = TileType.FLOOR) => {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const x = cx + dx;
        const y = cy + dy;
        if (y >= 0 && y < gridHeight && x >= 0 && x < gridWidth) {
          if (grid[y][x] === TileType.WALL || grid[y][x] === TileType.COVER) {
            grid[y][x] = tileType;
          }
        }
      }
    }
  };

  // Place spawn (top-left area) and exit (bottom-right area) as TILE coords
  let spawnTile: Vec2 = { x: 2, y: 2 };
  let exitTile: Vec2 = { x: gridWidth - 3, y: gridHeight - 3 };

  // Find valid spawn position
  for (let y = 1; y < gridHeight / 3; y++) {
    for (let x = 1; x < gridWidth / 3; x++) {
      if (grid[y][x] === TileType.FLOOR) {
        spawnTile = { x, y };
        break;
      }
    }
    if (grid[spawnTile.y][spawnTile.x] === TileType.FLOOR) break;
  }

  // Find valid exit position
  for (let y = gridHeight - 2; y > (gridHeight * 2) / 3; y--) {
    for (let x = gridWidth - 2; x > (gridWidth * 2) / 3; x--) {
      if (grid[y][x] === TileType.FLOOR) {
        exitTile = { x, y };
        break;
      }
    }
    if (grid[exitTile.y][exitTile.x] === TileType.FLOOR) break;
  }

  // Ensure 3x3 clearance around spawn/exit, then stamp tiles
  clear3x3(spawnTile.x, spawnTile.y);
  clear3x3(exitTile.x, exitTile.y);
  grid[spawnTile.y][spawnTile.x] = TileType.SPAWN;
  grid[exitTile.y][exitTile.x] = TileType.EXIT;

  // Validate path exists using flood fill (tile-space)
  if (!hasValidPath(grid, spawnTile, exitTile)) {
    // Force a path
    carveHorizontalCorridor(grid, spawnTile.x, exitTile.x, spawnTile.y);
    carveVerticalCorridor(grid, spawnTile.y, exitTile.y, exitTile.x);
    clear3x3(spawnTile.x, spawnTile.y);
    clear3x3(exitTile.x, exitTile.y);
    grid[spawnTile.y][spawnTile.x] = TileType.SPAWN;
    grid[exitTile.y][exitTile.x] = TileType.EXIT;
  }

  const spawnPos: Vec2 = { x: spawnTile.x + 0.5, y: spawnTile.y + 0.5 };
  const exitPos: Vec2 = { x: exitTile.x + 0.5, y: exitTile.y + 0.5 };

  // Generate ammo pickups
  const ammoPickups: AmmoPickup[] = [];
  const ammoCount = rng.nextInt(COMBAT_CONFIG.ammoDropCount.min, COMBAT_CONFIG.ammoDropCount.max);
  for (let i = 0; i < ammoCount; i++) {
    let attempts = 0;
    while (attempts < 30) {
      const x = rng.nextInt(2, gridWidth - 3);
      const y = rng.nextInt(2, gridHeight - 3);

      if (
        grid[y][x] === TileType.FLOOR &&
        distance({ x, y }, spawnTile) > 3 &&
        !ammoPickups.some(a => distance(a.pos, { x, y }) < 3)
      ) {
        grid[y][x] = TileType.AMMO;
        ammoPickups.push({
          pos: { x: x + 0.5, y: y + 0.5 },
          amount: COMBAT_CONFIG.ammoPickupAmount,
          collected: false,
        });
        break;
      }
      attempts++;
    }
  }

  // Generate enemies
  const enemyCount = rng.nextInt(config.enemyCount.min, config.enemyCount.max);
  const enemies: Enemy[] = [];

  for (let i = 0; i < enemyCount; i++) {
    let attempts = 0;
    while (attempts < 50) {
      const x = rng.nextInt(2, gridWidth - 3);
      const y = rng.nextInt(2, gridHeight - 3);

      // Must be on floor, away from spawn and exit
      if (
        grid[y][x] === TileType.FLOOR &&
        distance({ x, y }, spawnTile) > 5 &&
        distance({ x, y }, exitTile) > 3
      ) {
        // Generate patrol waypoints
        const waypoints = generatePatrolPath(grid, { x, y }, rng, 3, 6);

        enemies.push({
          id: i,
          pos: { x: x + 0.5, y: y + 0.5 },
          angle: rng.next() * Math.PI * 2,
          state: EnemyState.PATROL,
          waypoints,
          currentWaypointIndex: 0,
          investigateTarget: null,
          lastKnownPlayerPos: null,
          alertLevel: 0,
          stateTimer: 0,
          speed: config.enemyPatrolSpeed,
          ammo: COMBAT_CONFIG.enemyAmmo,
          maxAmmo: COMBAT_CONFIG.enemyAmmo,
          health: COMBAT_CONFIG.enemyHealth,
          shootCooldown: 0,
          isDead: false,
        });
        break;
      }
      attempts++;
    }
  }

  return { grid, spawnPos, exitPos, enemies, ammoPickups };
}

function carveHorizontalCorridor(
  grid: TileType[][],
  x1: number,
  x2: number,
  y: number
): void {
  const start = Math.min(x1, x2);
  const end = Math.max(x1, x2);
  for (let x = start; x <= end; x++) {
    if (grid[y] && grid[y][x] === TileType.WALL) {
      grid[y][x] = TileType.FLOOR;
    }
  }
}

function carveVerticalCorridor(
  grid: TileType[][],
  y1: number,
  y2: number,
  x: number
): void {
  const start = Math.min(y1, y2);
  const end = Math.max(y1, y2);
  for (let y = start; y <= end; y++) {
    if (grid[y] && grid[y][x] === TileType.WALL) {
      grid[y][x] = TileType.FLOOR;
    }
  }
}

function hasValidPath(grid: TileType[][], start: Vec2, end: Vec2): boolean {
  const height = grid.length;
  const width = grid[0].length;
  const visited: boolean[][] = Array(height)
    .fill(null)
    .map(() => Array(width).fill(false));

  const queue: Vec2[] = [start];
  visited[start.y][start.x] = true;

  const directions = [
    { x: 0, y: -1 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
    { x: 1, y: 0 },
  ];

  while (queue.length > 0) {
    const current = queue.shift()!;

    if (current.x === end.x && current.y === end.y) {
      return true;
    }

    for (const dir of directions) {
      const nx = current.x + dir.x;
      const ny = current.y + dir.y;

      if (
        nx >= 0 &&
        nx < width &&
        ny >= 0 &&
        ny < height &&
        !visited[ny][nx] &&
        grid[ny][nx] !== TileType.WALL
      ) {
        visited[ny][nx] = true;
        queue.push({ x: nx, y: ny });
      }
    }
  }

  return false;
}

function generatePatrolPath(
  grid: TileType[][],
  start: Vec2,
  rng: SeededRandom,
  minWaypoints: number,
  maxWaypoints: number
): Vec2[] {
  const waypoints: Vec2[] = [{ x: start.x + 0.5, y: start.y + 0.5 }];
  const numWaypoints = rng.nextInt(minWaypoints, maxWaypoints);
  const height = grid.length;
  const width = grid[0].length;

  let current = start;
  for (let i = 0; i < numWaypoints; i++) {
    let attempts = 0;
    while (attempts < 20) {
      const dx = rng.nextInt(-5, 5);
      const dy = rng.nextInt(-5, 5);
      const nx = current.x + dx;
      const ny = current.y + dy;

      if (
        nx >= 1 &&
        nx < width - 1 &&
        ny >= 1 &&
        ny < height - 1 &&
        grid[ny][nx] !== TileType.WALL
      ) {
        waypoints.push({ x: nx + 0.5, y: ny + 0.5 });
        current = { x: nx, y: ny };
        break;
      }
      attempts++;
    }
  }

  return waypoints;
}
