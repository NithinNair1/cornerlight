import { TileType, Vec2, Enemy, EnemyState, AmmoPickup } from './types';
import { COMBAT_CONFIG } from './config';

export interface LevelData {
  name: string;
  author: string;
  version: number;
  gridWidth: number;
  gridHeight: number;
  grid: TileType[][];
  spawnPos: Vec2;
  exitPos: Vec2;
  enemySpawns: EnemySpawn[];
  createdAt: number;
  isFeatured?: boolean; // Community recognized level
}

export interface EnemySpawn {
  pos: Vec2;
  waypoints: Vec2[];
  angle: number;
}

export function encodeLevelToString(level: LevelData): string {
  const data = JSON.stringify(level);
  return btoa(encodeURIComponent(data));
}

export function decodeLevelFromString(code: string): LevelData | null {
  try {
    const data = decodeURIComponent(atob(code));
    const level = JSON.parse(data) as LevelData;
    
    // Validate level structure
    if (!level.grid || !level.spawnPos || !level.exitPos) {
      return null;
    }
    
    return level;
  } catch {
    return null;
  }
}

export function levelDataToGameData(level: LevelData): {
  grid: TileType[][];
  spawnPos: Vec2;
  exitPos: Vec2;
  enemies: Enemy[];
  ammoPickups: AmmoPickup[];
} {
  // Clone the grid
  const grid = level.grid.map(row => [...row]);
  
  // Find ammo pickups from grid
  const ammoPickups: AmmoPickup[] = [];
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      if (grid[y][x] === TileType.AMMO) {
        ammoPickups.push({
          pos: { x: x + 0.5, y: y + 0.5 },
          amount: COMBAT_CONFIG.ammoPickupAmount,
          collected: false,
        });
      }
    }
  }
  
  // Create enemies from spawns
  const enemies: Enemy[] = level.enemySpawns.map((spawn, i) => ({
    id: i,
    pos: { x: spawn.pos.x, y: spawn.pos.y },
    angle: spawn.angle,
    state: EnemyState.PATROL,
    waypoints: spawn.waypoints.length > 0 ? spawn.waypoints : [spawn.pos],
    currentWaypointIndex: 0,
    investigateTarget: null,
    lastKnownPlayerPos: null,
    alertLevel: 0,
    stateTimer: 0,
    speed: 1.5,
    ammo: COMBAT_CONFIG.enemyAmmo,
    maxAmmo: COMBAT_CONFIG.enemyAmmo,
    health: COMBAT_CONFIG.enemyHealth,
    shootCooldown: 0,
    isDead: false,
  }));
  
  return {
    grid,
    spawnPos: level.spawnPos,
    exitPos: level.exitPos,
    enemies,
    ammoPickups,
  };
}

export function createEmptyLevel(width: number, height: number): LevelData {
  const grid: TileType[][] = Array(height)
    .fill(null)
    .map(() => Array(width).fill(TileType.WALL));

  // Create a floor border inside
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      grid[y][x] = TileType.FLOOR;
    }
  }

  // Ensure 3x3 clear spawn/exit areas
  const clear3x3 = (cx: number, cy: number, tileType: TileType = TileType.FLOOR) => {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const x = cx + dx;
        const y = cy + dy;
        if (y >= 0 && y < height && x >= 0 && x < width) {
          grid[y][x] = tileType;
        }
      }
    }
  };

  clear3x3(2, 2);
  clear3x3(width - 3, height - 3);

  // Set spawn and exit
  grid[2][2] = TileType.SPAWN;
  grid[height - 3][width - 3] = TileType.EXIT;

  return {
    name: 'Untitled Level',
    author: 'Anonymous',
    version: 1,
    gridWidth: width,
    gridHeight: height,
    grid,
    spawnPos: { x: 2.5, y: 2.5 },
    exitPos: { x: width - 2.5, y: height - 2.5 },
    enemySpawns: [],
    createdAt: Date.now(),
  };
}

// Sample community levels
export const SAMPLE_LEVELS: LevelData[] = [
  {
    name: 'Training Grounds',
    author: 'Lovable',
    version: 1,
    gridWidth: 25,
    gridHeight: 25,
    grid: createTrainingGroundsGrid(),
    spawnPos: { x: 3.5, y: 3.5 },
    exitPos: { x: 21.5, y: 21.5 },
    enemySpawns: [
      { pos: { x: 12.5, y: 8.5 }, waypoints: [{ x: 12.5, y: 8.5 }, { x: 12.5, y: 16.5 }], angle: Math.PI / 2 },
      { pos: { x: 18.5, y: 12.5 }, waypoints: [{ x: 18.5, y: 12.5 }, { x: 10.5, y: 12.5 }], angle: Math.PI },
    ],
    createdAt: Date.now(),
    isFeatured: true,
  },
  {
    name: 'Warehouse Infiltration',
    author: 'Lovable',
    version: 1,
    gridWidth: 30,
    gridHeight: 25,
    grid: createWarehouseGrid(),
    spawnPos: { x: 3.5, y: 12.5 },
    exitPos: { x: 26.5, y: 12.5 },
    enemySpawns: [
      { pos: { x: 10.5, y: 6.5 }, waypoints: [{ x: 10.5, y: 6.5 }, { x: 10.5, y: 18.5 }], angle: Math.PI / 2 },
      { pos: { x: 15.5, y: 12.5 }, waypoints: [{ x: 15.5, y: 8.5 }, { x: 15.5, y: 16.5 }], angle: 0 },
      { pos: { x: 22.5, y: 6.5 }, waypoints: [{ x: 22.5, y: 6.5 }, { x: 22.5, y: 18.5 }], angle: Math.PI / 2 },
    ],
    createdAt: Date.now(),
    isFeatured: true,
  },
  {
    name: 'The Maze',
    author: 'Lovable',
    version: 1,
    gridWidth: 35,
    gridHeight: 35,
    grid: createMazeGrid(),
    spawnPos: { x: 3.5, y: 3.5 },
    exitPos: { x: 31.5, y: 31.5 },
    enemySpawns: [
      { pos: { x: 17.5, y: 10.5 }, waypoints: [{ x: 17.5, y: 10.5 }, { x: 17.5, y: 24.5 }], angle: Math.PI / 2 },
      { pos: { x: 10.5, y: 17.5 }, waypoints: [{ x: 10.5, y: 17.5 }, { x: 24.5, y: 17.5 }], angle: 0 },
      { pos: { x: 24.5, y: 24.5 }, waypoints: [{ x: 24.5, y: 24.5 }, { x: 28.5, y: 28.5 }], angle: Math.PI / 4 },
    ],
    createdAt: Date.now(),
    isFeatured: true,
  },
];

// Helper to ensure spawn area is clear (3x3 minimum)
function clearSpawnArea(grid: TileType[][], centerX: number, centerY: number, tileType: TileType = TileType.FLOOR): void {
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const x = centerX + dx;
      const y = centerY + dy;
      if (y >= 0 && y < grid.length && x >= 0 && x < grid[0].length) {
        grid[y][x] = tileType;
      }
    }
  }
}

function createTrainingGroundsGrid(): TileType[][] {
  const grid: TileType[][] = Array(25).fill(null).map(() => Array(25).fill(TileType.WALL));
  
  // Carve out main area
  for (let y = 1; y < 24; y++) {
    for (let x = 1; x < 24; x++) {
      grid[y][x] = TileType.FLOOR;
    }
  }
  
  // Add structural walls
  for (let x = 7; x < 10; x++) {
    grid[7][x] = TileType.WALL;
    grid[17][x] = TileType.WALL;
  }
  for (let x = 15; x < 18; x++) {
    grid[7][x] = TileType.WALL;
    grid[17][x] = TileType.WALL;
  }
  for (let y = 10; y < 15; y++) {
    grid[y][11] = TileType.WALL;
    grid[y][13] = TileType.WALL;
  }
  
  // Add cover
  grid[5][12] = TileType.COVER;
  grid[19][12] = TileType.COVER;
  grid[12][5] = TileType.COVER;
  grid[12][19] = TileType.COVER;
  
  // Add ammo
  grid[10][3] = TileType.AMMO;
  grid[14][21] = TileType.AMMO;
  
  // Clear spawn area (3x3)
  clearSpawnArea(grid, 3, 3);
  grid[3][3] = TileType.SPAWN;
  
  // Clear exit area (3x3)
  clearSpawnArea(grid, 21, 21);
  grid[21][21] = TileType.EXIT;
  
  return grid;
}

function createWarehouseGrid(): TileType[][] {
  const grid: TileType[][] = Array(25).fill(null).map(() => Array(30).fill(TileType.WALL));
  
  // Carve out main area
  for (let y = 1; y < 24; y++) {
    for (let x = 1; x < 29; x++) {
      grid[y][x] = TileType.FLOOR;
    }
  }
  
  // Add warehouse shelves (vertical walls)
  for (let y = 3; y < 10; y++) {
    grid[y][7] = TileType.WALL;
    grid[y][13] = TileType.WALL;
    grid[y][19] = TileType.WALL;
  }
  for (let y = 15; y < 22; y++) {
    grid[y][7] = TileType.WALL;
    grid[y][13] = TileType.WALL;
    grid[y][19] = TileType.WALL;
  }
  
  // Add cover crates
  grid[6][10] = TileType.COVER;
  grid[18][10] = TileType.COVER;
  grid[6][16] = TileType.COVER;
  grid[18][16] = TileType.COVER;
  grid[12][22] = TileType.COVER;
  
  // Add ammo
  grid[4][4] = TileType.AMMO;
  grid[20][25] = TileType.AMMO;
  grid[12][10] = TileType.AMMO;
  
  // Clear spawn area (3x3)
  clearSpawnArea(grid, 3, 12);
  grid[12][3] = TileType.SPAWN;
  
  // Clear exit area (3x3)
  clearSpawnArea(grid, 26, 12);
  grid[12][26] = TileType.EXIT;
  
  return grid;
}

function createMazeGrid(): TileType[][] {
  const grid: TileType[][] = Array(35).fill(null).map(() => Array(35).fill(TileType.WALL));
  
  // Carve out main pathways
  for (let y = 1; y < 34; y++) {
    for (let x = 1; x < 34; x++) {
      grid[y][x] = TileType.FLOOR;
    }
  }
  
  // Create maze walls
  // Horizontal walls
  for (let x = 1; x < 15; x++) { grid[6][x] = TileType.WALL; }
  for (let x = 20; x < 34; x++) { grid[6][x] = TileType.WALL; }
  for (let x = 5; x < 30; x++) { grid[12][x] = TileType.WALL; }
  for (let x = 1; x < 10; x++) { grid[18][x] = TileType.WALL; }
  for (let x = 15; x < 34; x++) { grid[18][x] = TileType.WALL; }
  for (let x = 5; x < 20; x++) { grid[24][x] = TileType.WALL; }
  for (let x = 25; x < 34; x++) { grid[24][x] = TileType.WALL; }
  for (let x = 1; x < 15; x++) { grid[28][x] = TileType.WALL; }
  
  // Vertical walls
  for (let y = 1; y < 10; y++) { grid[y][17] = TileType.WALL; }
  for (let y = 10; y < 20; y++) { grid[y][8] = TileType.WALL; }
  for (let y = 10; y < 20; y++) { grid[y][25] = TileType.WALL; }
  for (let y = 20; y < 34; y++) { grid[y][12] = TileType.WALL; }
  for (let y = 25; y < 34; y++) { grid[y][22] = TileType.WALL; }
  
  // Add cover at intersections
  grid[10][15] = TileType.COVER;
  grid[15][20] = TileType.COVER;
  grid[22][8] = TileType.COVER;
  grid[22][28] = TileType.COVER;
  grid[28][20] = TileType.COVER;
  
  // Add ammo throughout maze
  grid[4][10] = TileType.AMMO;
  grid[15][5] = TileType.AMMO;
  grid[10][28] = TileType.AMMO;
  grid[26][15] = TileType.AMMO;
  
  // Clear spawn area (3x3)
  clearSpawnArea(grid, 3, 3);
  grid[3][3] = TileType.SPAWN;
  
  // Clear exit area (3x3)
  clearSpawnArea(grid, 31, 31);
  grid[31][31] = TileType.EXIT;
  
  return grid;
}
