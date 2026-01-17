import { GameState, InputState, TileType, NoiseMarker, Bullet } from './types';
import { updateEnemy } from './enemyAI';
import { resolveCollision, isWalkable } from './collision';
import { angleBetween, distance } from './utils';
import { COMBAT_CONFIG } from './config';
import { audioManager } from './audio';

export function updateGame(
  state: GameState,
  input: InputState,
  deltaTime: number
): GameState {
  if (state.isPaused || state.isGameOver || state.isWin) {
    return state;
  }

  const newState = { ...state };

  // Update player
  updatePlayer(newState, input, deltaTime);

  // Update noise markers
  newState.noiseMarkers = newState.noiseMarkers
    .map(n => ({ ...n, lifetime: n.lifetime - deltaTime }))
    .filter(n => n.lifetime > 0);

  // Update bullets
  updateBullets(newState, deltaTime);

  // Update enemies
  let maxDetection = 0;
  for (let i = 0; i < newState.enemies.length; i++) {
    const enemy = newState.enemies[i];
    if (enemy.isDead) continue;

    const result = updateEnemy(
      enemy,
      newState.player,
      newState.grid,
      newState.config,
      deltaTime,
      newState.noiseMarkers,
      newState
    );
    maxDetection = Math.max(maxDetection, result.alertLevel);

    // Check if enemy should shoot
    if (result.shouldShoot && enemy.ammo > 0 && enemy.shootCooldown <= 0) {
      enemyShoot(newState, enemy);
    }

    // Check if player caught (only if not shooting)
    if (distance(enemy.pos, newState.player.pos) < 0.8 && 
        enemy.alertLevel >= 100) {
      newState.player.health -= 1;
      if (newState.player.health <= 0) {
        newState.isGameOver = true;
        audioManager.playLevelFailed();
      }
    }
  }
  newState.detectionLevel = maxDetection;

  // Check win condition - all enemies must be eliminated first
  const allEnemiesDead = newState.enemies.every(e => e.isDead);
  const playerTileX = Math.floor(newState.player.pos.x);
  const playerTileY = Math.floor(newState.player.pos.y);
  if (
    playerTileY >= 0 &&
    playerTileY < newState.grid.length &&
    playerTileX >= 0 &&
    playerTileX < newState.grid[0].length &&
    newState.grid[playerTileY][playerTileX] === TileType.EXIT &&
    allEnemiesDead
  ) {
    newState.isWin = true;
    audioManager.playLevelComplete();
  }

  // Check ammo pickups
  for (const pickup of newState.ammoPickups) {
    if (pickup.collected) continue;
    if (distance(newState.player.pos, pickup.pos) < 0.7) {
      pickup.collected = true;
      newState.player.ammo = Math.min(
        newState.player.ammo + pickup.amount,
        newState.player.maxAmmo
      );
      audioManager.playAmmoPickup();
    }
  }

  return newState;
}

function updatePlayer(
  state: GameState,
  input: InputState,
  deltaTime: number
): void {
  const { player, grid, config } = state;

  // Update shoot cooldown
  player.shootCooldown = Math.max(0, player.shootCooldown - deltaTime);

  // Determine speed
  let speed = config.playerWalkSpeed;
  player.isSprinting = input.sprint && !input.sneak;
  player.isSneaking = input.sneak && !input.sprint;

  if (player.isSprinting) {
    speed = config.playerSprintSpeed;
    player.noiseLevel = 1;
  } else if (player.isSneaking) {
    speed = config.playerSneakSpeed;
    player.noiseLevel = 0;
  } else {
    player.noiseLevel = 0.3;
  }

  // Movement
  let dx = 0;
  let dy = 0;
  if (input.up) dy -= 1;
  if (input.down) dy += 1;
  if (input.left) dx -= 1;
  if (input.right) dx += 1;

  // Normalize diagonal movement
  if (dx !== 0 && dy !== 0) {
    const len = Math.sqrt(dx * dx + dy * dy);
    dx /= len;
    dy /= len;
  }

  if (dx !== 0 || dy !== 0) {
    const newPos = {
      x: player.pos.x + dx * speed * deltaTime,
      y: player.pos.y + dy * speed * deltaTime,
    };

    player.pos = resolveCollision(grid, player.pos, newPos, 0.3);
    // Note: player.angle is now controlled by mouse position in GameCanvas
  } else {
    player.noiseLevel = 0;
  }

  // Handle throw distraction
  if (input.interact) {
    const throwDistance = 3;
    const targetX = player.pos.x + Math.cos(player.angle) * throwDistance;
    const targetY = player.pos.y + Math.sin(player.angle) * throwDistance;

    const noise: NoiseMarker = {
      pos: { x: targetX, y: targetY },
      radius: 2,
      lifetime: 2,
      maxLifetime: 2,
    };

    state.noiseMarkers.push(noise);
    input.interact = false; // Consume input
  }

  // Handle shooting
  if (input.shoot && player.ammo > 0 && player.shootCooldown <= 0) {
    playerShoot(state);
    input.shoot = false; // Consume input
  }
}

function playerShoot(state: GameState): void {
  const { player } = state;
  
  player.ammo -= 1;
  player.shootCooldown = COMBAT_CONFIG.shootCooldown;

  const bullet: Bullet = {
    id: state.nextBulletId++,
    pos: { ...player.pos },
    velocity: {
      x: Math.cos(player.angle) * COMBAT_CONFIG.bulletSpeed,
      y: Math.sin(player.angle) * COMBAT_CONFIG.bulletSpeed,
    },
    isPlayerBullet: true,
    lifetime: COMBAT_CONFIG.bulletLifetime,
  };

  state.bullets.push(bullet);
  audioManager.playGunshot(0.4);

  // Create noise at player position
  state.noiseMarkers.push({
    pos: { ...player.pos },
    radius: 6,
    lifetime: 1.5,
    maxLifetime: 1.5,
  });
}

function enemyShoot(state: GameState, enemy: typeof state.enemies[0]): void {
  enemy.ammo -= 1;
  enemy.shootCooldown = COMBAT_CONFIG.enemyShootCooldown;

  const bullet: Bullet = {
    id: state.nextBulletId++,
    pos: { ...enemy.pos },
    velocity: {
      x: Math.cos(enemy.angle) * COMBAT_CONFIG.bulletSpeed * 0.8,
      y: Math.sin(enemy.angle) * COMBAT_CONFIG.bulletSpeed * 0.8,
    },
    isPlayerBullet: false,
    lifetime: COMBAT_CONFIG.bulletLifetime,
  };

  state.bullets.push(bullet);
  audioManager.playGunshot(0.3);

  // Create noise at enemy position
  state.noiseMarkers.push({
    pos: { ...enemy.pos },
    radius: 4,
    lifetime: 1,
    maxLifetime: 1,
  });
}

function updateBullets(state: GameState, deltaTime: number): void {
  const { bullets, grid, player, enemies } = state;

  for (let i = bullets.length - 1; i >= 0; i--) {
    const bullet = bullets[i];
    
    // Update position
    bullet.pos.x += bullet.velocity.x * deltaTime;
    bullet.pos.y += bullet.velocity.y * deltaTime;
    bullet.lifetime -= deltaTime;

    // Check wall collision
    const tileX = Math.floor(bullet.pos.x);
    const tileY = Math.floor(bullet.pos.y);
    if (!isWalkable(grid, tileX, tileY)) {
      bullets.splice(i, 1);
      audioManager.playBulletImpact();
      continue;
    }

    // Check lifetime
    if (bullet.lifetime <= 0) {
      bullets.splice(i, 1);
      continue;
    }

    // Check collisions
    if (bullet.isPlayerBullet) {
      // Check enemy hits
      for (const enemy of enemies) {
        if (enemy.isDead) continue;
        if (distance(bullet.pos, enemy.pos) < 0.4) {
          enemy.health -= 1;
          bullets.splice(i, 1);
          if (enemy.health <= 0) {
            enemy.isDead = true;
            audioManager.playEnemyDeath();
            // Drop ammo at enemy position
            state.ammoPickups.push({
              pos: { x: enemy.pos.x, y: enemy.pos.y },
              amount: Math.floor(enemy.ammo / 2) + 2,
              collected: false,
            });
          } else {
            audioManager.playBulletImpact();
          }
          break;
        }
      }
    } else {
      // Check player hit
      if (distance(bullet.pos, player.pos) < 0.35) {
        player.health -= 1;
        bullets.splice(i, 1);
        audioManager.playBulletImpact();
        if (player.health <= 0) {
          state.isGameOver = true;
          audioManager.playLevelFailed();
        }
      }
    }
  }
}
