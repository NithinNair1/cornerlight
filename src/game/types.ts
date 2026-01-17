export interface Vec2 {
  x: number;
  y: number;
}

export interface Tile {
  x: number;
  y: number;
  type: TileType;
}

export enum TileType {
  FLOOR = 0,
  WALL = 1,
  COVER = 2,
  EXIT = 3,
  SPAWN = 4,
  AMMO = 5,
}

export interface Player {
  pos: Vec2;
  angle: number;
  isSprinting: boolean;
  isSneaking: boolean;
  speed: number;
  noiseLevel: number;
  ammo: number;
  maxAmmo: number;
  health: number;
  maxHealth: number;
  shootCooldown: number;
}

export enum EnemyState {
  PATROL = 'patrol',
  INVESTIGATE = 'investigate',
  CHASE = 'chase',
  RETURN = 'return',
}

export interface Enemy {
  id: number;
  pos: Vec2;
  angle: number;
  state: EnemyState;
  waypoints: Vec2[];
  currentWaypointIndex: number;
  investigateTarget: Vec2 | null;
  lastKnownPlayerPos: Vec2 | null;
  alertLevel: number; // 0-100
  stateTimer: number;
  speed: number;
  ammo: number;
  maxAmmo: number;
  health: number;
  shootCooldown: number;
  isDead: boolean;
}

export interface GameConfig {
  gridWidth: number;
  gridHeight: number;
  tileSize: number;
  visionAngle: number; // degrees
  visionRange: number; // tiles
  hearingRadius: number; // tiles
  enemyCount: { min: number; max: number };
  playerWalkSpeed: number;
  playerSprintSpeed: number;
  playerSneakSpeed: number;
  enemyPatrolSpeed: number;
  enemyChaseSpeed: number;
  chaseDuration: number; // seconds
  seed: number;
}

export interface Bullet {
  id: number;
  pos: Vec2;
  velocity: Vec2;
  isPlayerBullet: boolean;
  lifetime: number;
}

export interface AmmoPickup {
  pos: Vec2;
  amount: number;
  collected: boolean;
}

export interface GameState {
  player: Player;
  enemies: Enemy[];
  grid: TileType[][];
  config: GameConfig;
  isGameOver: boolean;
  isWin: boolean;
  isPaused: boolean;
  debugMode: boolean;
  detectionLevel: number; // 0-100
  noiseMarkers: NoiseMarker[];
  bullets: Bullet[];
  ammoPickups: AmmoPickup[];
  nextBulletId: number;
  exploredTiles: boolean[][]; // Fog of war tracking
}

export interface NoiseMarker {
  pos: Vec2;
  radius: number;
  lifetime: number;
  maxLifetime: number;
}

export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  sprint: boolean;
  sneak: boolean;
  interact: boolean;
  shoot: boolean;
  mousePos: Vec2;
  mouseDown: boolean;
}
