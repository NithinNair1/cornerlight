import { Enemy, EnemyState, Player, TileType, GameConfig, Vec2, NoiseMarker, GameState } from './types';
import { distance, angleBetween, angleDifference, degToRad, normalize } from './utils';
import { hasLineOfSight, resolveCollision } from './collision';

export function updateEnemy(
  enemy: Enemy,
  player: Player,
  grid: TileType[][],
  config: GameConfig,
  deltaTime: number,
  noiseMarkers: NoiseMarker[],
  gameState: GameState
): { detected: boolean; alertLevel: number; shouldShoot: boolean } {
  if (enemy.isDead) {
    return { detected: false, alertLevel: 0, shouldShoot: false };
  }

  let detected = false;
  let shouldShoot = false;
  const playerTilePos = { x: player.pos.x, y: player.pos.y };
  
  // Update shoot cooldown
  enemy.shootCooldown = Math.max(0, enemy.shootCooldown - deltaTime);

  // Check if player is in vision cone
  const distToPlayer = distance(enemy.pos, playerTilePos);
  const angleToPlayer = angleBetween(enemy.pos, playerTilePos);
  const angleDiff = Math.abs(angleDifference(enemy.angle, angleToPlayer));
  const halfVisionAngle = degToRad(config.visionAngle / 2);

  // Sneaking reduces visibility
  const effectiveVisionRange = player.isSneaking 
    ? config.visionRange * 0.6 
    : config.visionRange;

  const inVisionCone = 
    distToPlayer <= effectiveVisionRange &&
    angleDiff <= halfVisionAngle &&
    hasLineOfSight(grid, enemy.pos, playerTilePos);

  // Check hearing
  const hearingRange = player.isSprinting 
    ? config.hearingRadius * 1.5 
    : player.isSneaking 
      ? config.hearingRadius * 0.3 
      : config.hearingRadius;

  const canHear = distToPlayer <= hearingRange && player.noiseLevel > 0;

  // Check noise markers
  let closestNoise: Vec2 | null = null;
  let closestNoiseDist = Infinity;
  for (const noise of noiseMarkers) {
    const noiseDist = distance(enemy.pos, noise.pos);
    if (noiseDist <= config.hearingRadius && noiseDist < closestNoiseDist) {
      closestNoiseDist = noiseDist;
      closestNoise = noise.pos;
    }
  }

  // Update alert level
  if (inVisionCone) {
    enemy.alertLevel += (100 / (player.isSneaking ? 2 : 0.8)) * deltaTime;
    enemy.lastKnownPlayerPos = { ...playerTilePos };
    detected = true;
  } else if (canHear || closestNoise) {
    enemy.alertLevel += 30 * deltaTime;
    if (closestNoise) {
      enemy.investigateTarget = closestNoise;
    } else {
      enemy.investigateTarget = { ...playerTilePos };
    }
  } else {
    enemy.alertLevel = Math.max(0, enemy.alertLevel - 15 * deltaTime);
  }

  enemy.alertLevel = Math.min(100, enemy.alertLevel);

  // State machine
  switch (enemy.state) {
    case EnemyState.PATROL:
      if (enemy.alertLevel >= 100) {
        enemy.state = EnemyState.CHASE;
        enemy.stateTimer = config.chaseDuration;
        enemy.speed = config.enemyChaseSpeed;
      } else if (enemy.alertLevel >= 40) {
        enemy.state = EnemyState.INVESTIGATE;
        enemy.stateTimer = 3;
      } else {
        patrolBehavior(enemy, grid, deltaTime);
      }
      break;

    case EnemyState.INVESTIGATE:
      enemy.stateTimer -= deltaTime;
      if (enemy.alertLevel >= 100) {
        enemy.state = EnemyState.CHASE;
        enemy.stateTimer = config.chaseDuration;
        enemy.speed = config.enemyChaseSpeed;
      } else if (enemy.stateTimer <= 0 || enemy.alertLevel < 10) {
        enemy.state = EnemyState.RETURN;
        enemy.investigateTarget = null;
      } else {
        investigateBehavior(enemy, grid, deltaTime);
      }
      break;

    case EnemyState.CHASE:
      enemy.stateTimer -= deltaTime;
      if (inVisionCone) {
        enemy.stateTimer = config.chaseDuration; // Reset timer while seeing player
        // Try to shoot if in range and has ammo
        if (distToPlayer <= 8 && enemy.ammo > 0 && enemy.shootCooldown <= 0) {
          shouldShoot = true;
        }
      }
      if (enemy.stateTimer <= 0) {
        enemy.state = EnemyState.RETURN;
        enemy.speed = config.enemyPatrolSpeed;
        enemy.alertLevel = 30;
      } else {
        chaseBehavior(enemy, player, grid, deltaTime);
      }
      break;

    case EnemyState.RETURN:
      if (enemy.alertLevel >= 60) {
        enemy.state = EnemyState.INVESTIGATE;
        enemy.stateTimer = 3;
      } else {
        const returned = returnBehavior(enemy, grid, deltaTime);
        if (returned) {
          enemy.state = EnemyState.PATROL;
          enemy.speed = config.enemyPatrolSpeed;
        }
      }
      break;
  }

  return { detected, alertLevel: enemy.alertLevel, shouldShoot };
}

function patrolBehavior(enemy: Enemy, grid: TileType[][], deltaTime: number): void {
  if (enemy.waypoints.length === 0) return;

  const target = enemy.waypoints[enemy.currentWaypointIndex];
  moveToward(enemy, target, grid, deltaTime);

  if (distance(enemy.pos, target) < 0.5) {
    enemy.currentWaypointIndex = (enemy.currentWaypointIndex + 1) % enemy.waypoints.length;
  }
}

function investigateBehavior(enemy: Enemy, grid: TileType[][], deltaTime: number): void {
  if (!enemy.investigateTarget) return;

  moveToward(enemy, enemy.investigateTarget, grid, deltaTime);

  if (distance(enemy.pos, enemy.investigateTarget) < 0.5) {
    // Look around
    enemy.angle += deltaTime * 2;
  }
}

function chaseBehavior(
  enemy: Enemy,
  player: Player,
  grid: TileType[][],
  deltaTime: number
): void {
  const target = enemy.lastKnownPlayerPos || player.pos;
  moveToward(enemy, target, grid, deltaTime);
}

function returnBehavior(enemy: Enemy, grid: TileType[][], deltaTime: number): boolean {
  if (enemy.waypoints.length === 0) return true;

  const target = enemy.waypoints[0];
  moveToward(enemy, target, grid, deltaTime);

  return distance(enemy.pos, target) < 0.5;
}

function moveToward(
  enemy: Enemy,
  target: Vec2,
  grid: TileType[][],
  deltaTime: number
): void {
  const direction = normalize({
    x: target.x - enemy.pos.x,
    y: target.y - enemy.pos.y,
  });

  if (direction.x !== 0 || direction.y !== 0) {
    enemy.angle = angleBetween(enemy.pos, target);
  }

  const newPos = {
    x: enemy.pos.x + direction.x * enemy.speed * deltaTime,
    y: enemy.pos.y + direction.y * enemy.speed * deltaTime,
  };

  enemy.pos = resolveCollision(grid, enemy.pos, newPos, 0.35);
}
