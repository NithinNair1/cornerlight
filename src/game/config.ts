import { GameConfig } from './types';

export const DEFAULT_CONFIG: GameConfig = {
  gridWidth: 24,
  gridHeight: 18,
  tileSize: 32,
  visionAngle: 120, // degrees
  visionRange: 6, // tiles
  hearingRadius: 4, // tiles
  enemyCount: { min: 3, max: 5 },
  playerWalkSpeed: 3,
  playerSprintSpeed: 5.5,
  playerSneakSpeed: 1.5,
  enemyPatrolSpeed: 1.8,
  enemyChaseSpeed: 4,
  chaseDuration: 4, // seconds
  seed: Date.now(),
};

export const COMBAT_CONFIG = {
  playerStartAmmo: 12,
  playerMaxAmmo: 24,
  playerHealth: 3,
  enemyAmmo: 6,
  enemyHealth: 1,
  bulletSpeed: 15,
  bulletLifetime: 2,
  shootCooldown: 0.3,
  enemyShootCooldown: 0.8,
  ammoPickupAmount: 6,
  ammoDropCount: { min: 4, max: 8 },
};

export const COLORS = {
  background: '#0d1117',
  floor: '#161b22',
  floorAlt: '#1a2028',
  wall: '#2d333b',
  wallHighlight: '#3d434b',
  player: '#00d4ff',
  playerGlow: 'rgba(0, 212, 255, 0.3)',
  enemy: '#ff4757',
  enemyDead: '#444444',
  enemyGlow: 'rgba(255, 71, 87, 0.3)',
  visionCone: 'rgba(255, 165, 0, 0.15)',
  visionConeAlert: 'rgba(255, 71, 87, 0.25)',
  visionEdge: 'rgba(255, 165, 0, 0.4)',
  hearingRadius: 'rgba(180, 120, 255, 0.1)',
  exit: '#2ed573',
  exitGlow: 'rgba(46, 213, 115, 0.4)',
  noise: 'rgba(255, 200, 100, 0.5)',
  cover: '#4a5568',
  gridLine: 'rgba(255, 255, 255, 0.03)',
  bullet: '#ffff00',
  bulletGlow: 'rgba(255, 255, 0, 0.5)',
  ammo: '#ffa500',
  ammoGlow: 'rgba(255, 165, 0, 0.4)',
};
