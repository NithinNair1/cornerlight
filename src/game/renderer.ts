import { GameState, TileType, EnemyState, AmmoPickup } from './types';
import { COLORS } from './config';
import { degToRad } from './utils';

export function renderGame(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  canvasWidth: number,
  canvasHeight: number,
  fogOfWarEnabled: boolean = true
): void {
  const { grid, player, enemies, config, debugMode, noiseMarkers, bullets, ammoPickups, exploredTiles } = state;
  const { tileSize } = config;

  // Calculate camera offset to center on player
  const offsetX = canvasWidth / 2 - player.pos.x * tileSize;
  const offsetY = canvasHeight / 2 - player.pos.y * tileSize;

  // Clear
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  ctx.save();
  ctx.translate(offsetX, offsetY);

  // Update explored tiles based on player position
  const visionRadius = 6;
  const px = Math.floor(player.pos.x);
  const py = Math.floor(player.pos.y);
  for (let dy = -visionRadius; dy <= visionRadius; dy++) {
    for (let dx = -visionRadius; dx <= visionRadius; dx++) {
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= visionRadius) {
        const tx = px + dx;
        const ty = py + dy;
        if (ty >= 0 && ty < grid.length && tx >= 0 && tx < grid[0].length) {
          exploredTiles[ty][tx] = true;
        }
      }
    }
  }

  // Render grid
  renderGrid(ctx, grid, tileSize, exploredTiles, fogOfWarEnabled, player.pos, enemies);

  // Render ammo pickups (only if visible/explored)
  for (const pickup of ammoPickups) {
    if (!pickup.collected) {
      const tx = Math.floor(pickup.pos.x);
      const ty = Math.floor(pickup.pos.y);
      if (!fogOfWarEnabled || (exploredTiles[ty]?.[tx] && isInVisionRange(player.pos, pickup.pos, visionRadius))) {
        renderAmmoPickup(ctx, pickup, tileSize);
      }
    }
  }

  // Render noise markers
  for (const noise of noiseMarkers) {
    renderNoiseMarker(ctx, noise, tileSize);
  }

  // Render enemies (only if visible/explored)
  for (const enemy of enemies) {
    if (!enemy.isDead) {
      const inVision = isInVisionRange(player.pos, enemy.pos, visionRadius);
      if (!fogOfWarEnabled || inVision) {
        renderEnemyVision(ctx, enemy, config.visionAngle, config.visionRange, tileSize, debugMode);
        if (debugMode) {
          renderHearingRadius(ctx, enemy, config.hearingRadius, tileSize);
        }
      }
    }
  }

  for (const enemy of enemies) {
    const inVision = isInVisionRange(player.pos, enemy.pos, visionRadius);
    if (!fogOfWarEnabled || inVision) {
      renderEnemy(ctx, enemy, tileSize);
    }
  }

  // Render bullets
  for (const bullet of bullets) {
    renderBullet(ctx, bullet, tileSize);
  }

  // Render player
  renderPlayer(ctx, player, tileSize);

  ctx.restore();
}

function isInVisionRange(playerPos: { x: number; y: number }, targetPos: { x: number; y: number }, range: number): boolean {
  const dx = targetPos.x - playerPos.x;
  const dy = targetPos.y - playerPos.y;
  return Math.sqrt(dx * dx + dy * dy) <= range;
}

function renderGrid(
  ctx: CanvasRenderingContext2D,
  grid: TileType[][],
  tileSize: number,
  exploredTiles: boolean[][],
  fogOfWarEnabled: boolean,
  playerPos: { x: number; y: number },
  enemies: { isDead: boolean }[]
): void {
  const visionRadius = 6;
  
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      const tile = grid[y][x];
      const px = x * tileSize;
      const py = y * tileSize;
      
      const isExplored = exploredTiles[y]?.[x] ?? false;
      const dx = x + 0.5 - playerPos.x;
      const dy = y + 0.5 - playerPos.y;
      const distToPlayer = Math.sqrt(dx * dx + dy * dy);
      const inVision = distToPlayer <= visionRadius;
      
      // Skip unexplored tiles in fog of war mode
      if (fogOfWarEnabled && !isExplored) {
        ctx.fillStyle = '#000000';
        ctx.fillRect(px, py, tileSize, tileSize);
        continue;
      }
      
      // Dim explored but out-of-vision tiles
      const dimmed = fogOfWarEnabled && !inVision;

      switch (tile) {
        case TileType.FLOOR:
        case TileType.SPAWN:
        case TileType.AMMO:
          // Checkerboard floor
          ctx.fillStyle = (x + y) % 2 === 0 ? COLORS.floor : COLORS.floorAlt;
          ctx.fillRect(px, py, tileSize, tileSize);
          break;

        case TileType.WALL:
          // Wall with highlight
          ctx.fillStyle = COLORS.wall;
          ctx.fillRect(px, py, tileSize, tileSize);
          ctx.fillStyle = COLORS.wallHighlight;
          ctx.fillRect(px, py, tileSize, 2);
          ctx.fillRect(px, py, 2, tileSize);
          break;

        case TileType.COVER:
          ctx.fillStyle = COLORS.floor;
          ctx.fillRect(px, py, tileSize, tileSize);
          ctx.fillStyle = COLORS.cover;
          ctx.fillRect(px + 4, py + 4, tileSize - 8, tileSize - 8);
          break;

        case TileType.EXIT:
          ctx.fillStyle = COLORS.floor;
          ctx.fillRect(px, py, tileSize, tileSize);
          
          // Check if all enemies are dead to determine exit state
          const allEnemiesDefeated = enemies.every(e => e.isDead);
          
          // Glowing exit - different color based on active state
          const gradient = ctx.createRadialGradient(
            px + tileSize / 2,
            py + tileSize / 2,
            0,
            px + tileSize / 2,
            py + tileSize / 2,
            tileSize
          );
          
          if (allEnemiesDefeated) {
            gradient.addColorStop(0, COLORS.exitGlow);
            gradient.addColorStop(1, 'transparent');
          } else {
            // Inactive exit - dimmed red glow
            gradient.addColorStop(0, 'rgba(255, 71, 87, 0.3)');
            gradient.addColorStop(1, 'transparent');
          }
          ctx.fillStyle = gradient;
          ctx.fillRect(px - tileSize / 2, py - tileSize / 2, tileSize * 2, tileSize * 2);

          ctx.fillStyle = allEnemiesDefeated ? COLORS.exit : '#555';
          ctx.beginPath();
          ctx.arc(px + tileSize / 2, py + tileSize / 2, tileSize / 3, 0, Math.PI * 2);
          ctx.fill();
          
          // Lock icon when inactive
          if (!allEnemiesDefeated) {
            ctx.fillStyle = '#ff4757';
            ctx.font = 'bold 10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('🔒', px + tileSize / 2, py + tileSize / 2 + 4);
          }
          break;
      }

      // Apply fog overlay for explored but not in vision
      if (dimmed) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(px, py, tileSize, tileSize);
      }

      // Grid lines
      ctx.strokeStyle = COLORS.gridLine;
      ctx.strokeRect(px, py, tileSize, tileSize);
    }
  }
}

function renderAmmoPickup(
  ctx: CanvasRenderingContext2D,
  pickup: AmmoPickup,
  tileSize: number
): void {
  const px = pickup.pos.x * tileSize;
  const py = pickup.pos.y * tileSize;
  const radius = tileSize * 0.25;

  // Glow
  const gradient = ctx.createRadialGradient(px, py, 0, px, py, radius * 2);
  gradient.addColorStop(0, COLORS.ammoGlow);
  gradient.addColorStop(1, 'transparent');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(px, py, radius * 2, 0, Math.PI * 2);
  ctx.fill();

  // Ammo box
  ctx.fillStyle = COLORS.ammo;
  ctx.fillRect(px - radius, py - radius * 0.6, radius * 2, radius * 1.2);
  
  // Bullet icons
  ctx.fillStyle = '#ffcc00';
  ctx.beginPath();
  ctx.arc(px - radius * 0.4, py, radius * 0.2, 0, Math.PI * 2);
  ctx.arc(px + radius * 0.4, py, radius * 0.2, 0, Math.PI * 2);
  ctx.fill();
}

function renderBullet(
  ctx: CanvasRenderingContext2D,
  bullet: { pos: { x: number; y: number }; isPlayerBullet: boolean },
  tileSize: number
): void {
  const px = bullet.pos.x * tileSize;
  const py = bullet.pos.y * tileSize;
  const radius = tileSize * 0.08;

  // Glow
  const gradient = ctx.createRadialGradient(px, py, 0, px, py, radius * 3);
  gradient.addColorStop(0, COLORS.bulletGlow);
  gradient.addColorStop(1, 'transparent');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(px, py, radius * 3, 0, Math.PI * 2);
  ctx.fill();

  // Bullet
  ctx.fillStyle = bullet.isPlayerBullet ? COLORS.player : COLORS.enemy;
  ctx.beginPath();
  ctx.arc(px, py, radius, 0, Math.PI * 2);
  ctx.fill();
}

function renderPlayer(
  ctx: CanvasRenderingContext2D,
  player: { pos: { x: number; y: number }; angle: number; isSneaking: boolean; health: number; maxHealth: number },
  tileSize: number
): void {
  const px = player.pos.x * tileSize;
  const py = player.pos.y * tileSize;
  const radius = tileSize * 0.35;

  // Glow
  const gradient = ctx.createRadialGradient(px, py, 0, px, py, radius * 2.5);
  gradient.addColorStop(0, COLORS.playerGlow);
  gradient.addColorStop(1, 'transparent');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(px, py, radius * 2.5, 0, Math.PI * 2);
  ctx.fill();

  // Body
  ctx.fillStyle = COLORS.player;
  ctx.globalAlpha = player.isSneaking ? 0.6 : 1;
  ctx.beginPath();
  ctx.arc(px, py, radius, 0, Math.PI * 2);
  ctx.fill();

  // Direction indicator (gun)
  ctx.strokeStyle = COLORS.player;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(px, py);
  ctx.lineTo(
    px + Math.cos(player.angle) * radius * 1.8,
    py + Math.sin(player.angle) * radius * 1.8
  );
  ctx.stroke();

  ctx.globalAlpha = 1;

  // Health indicator
  if (player.health < player.maxHealth) {
    const healthWidth = radius * 2;
    const healthHeight = 4;
    ctx.fillStyle = '#333';
    ctx.fillRect(px - healthWidth / 2, py - radius - 12, healthWidth, healthHeight);
    ctx.fillStyle = player.health === 1 ? '#ff4757' : '#2ed573';
    ctx.fillRect(px - healthWidth / 2, py - radius - 12, healthWidth * (player.health / player.maxHealth), healthHeight);
  }
}

function renderEnemy(
  ctx: CanvasRenderingContext2D,
  enemy: { pos: { x: number; y: number }; angle: number; state: EnemyState; alertLevel: number; isDead: boolean; ammo: number },
  tileSize: number
): void {
  const px = enemy.pos.x * tileSize;
  const py = enemy.pos.y * tileSize;
  const radius = tileSize * 0.35;

  if (enemy.isDead) {
    // Dead enemy
    ctx.fillStyle = COLORS.enemyDead;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.arc(px, py, radius * 0.8, 0, Math.PI * 2);
    ctx.fill();
    
    // X mark
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px - radius * 0.4, py - radius * 0.4);
    ctx.lineTo(px + radius * 0.4, py + radius * 0.4);
    ctx.moveTo(px + radius * 0.4, py - radius * 0.4);
    ctx.lineTo(px - radius * 0.4, py + radius * 0.4);
    ctx.stroke();
    
    ctx.globalAlpha = 1;
    return;
  }

  // Glow based on state
  const glowColor = enemy.state === EnemyState.CHASE 
    ? 'rgba(255, 71, 87, 0.5)' 
    : enemy.state === EnemyState.INVESTIGATE 
      ? 'rgba(255, 165, 0, 0.4)'
      : COLORS.enemyGlow;

  const gradient = ctx.createRadialGradient(px, py, 0, px, py, radius * 2);
  gradient.addColorStop(0, glowColor);
  gradient.addColorStop(1, 'transparent');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(px, py, radius * 2, 0, Math.PI * 2);
  ctx.fill();

  // Body
  ctx.fillStyle = COLORS.enemy;
  ctx.beginPath();
  ctx.arc(px, py, radius, 0, Math.PI * 2);
  ctx.fill();

  // Direction indicator (gun)
  ctx.strokeStyle = COLORS.enemy;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(px, py);
  ctx.lineTo(
    px + Math.cos(enemy.angle) * radius * 1.5,
    py + Math.sin(enemy.angle) * radius * 1.5
  );
  ctx.stroke();

  // Alert indicator
  if (enemy.alertLevel > 0) {
    ctx.fillStyle = enemy.alertLevel >= 100 ? '#ff4757' : '#ffa502';
    ctx.font = 'bold 14px Orbitron';
    ctx.textAlign = 'center';
    const symbol = enemy.alertLevel >= 100 ? '!' : '?';
    ctx.fillText(symbol, px, py - radius - 10);
  }

  // Ammo indicator (small dots)
  if (enemy.ammo > 0) {
    const dotSpacing = 4;
    const startX = px - ((enemy.ammo - 1) * dotSpacing) / 2;
    ctx.fillStyle = '#ffa502';
    for (let i = 0; i < enemy.ammo; i++) {
      ctx.beginPath();
      ctx.arc(startX + i * dotSpacing, py + radius + 8, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function renderEnemyVision(
  ctx: CanvasRenderingContext2D,
  enemy: { pos: { x: number; y: number }; angle: number; state: EnemyState; alertLevel: number },
  visionAngle: number,
  visionRange: number,
  tileSize: number,
  debugMode: boolean
): void {
  if (!debugMode && enemy.alertLevel < 20) return;

  const px = enemy.pos.x * tileSize;
  const py = enemy.pos.y * tileSize;
  const range = visionRange * tileSize;
  const halfAngle = degToRad(visionAngle / 2);

  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(enemy.angle);

  // Vision cone
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, range, -halfAngle, halfAngle);
  ctx.closePath();

  const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, range);
  const baseColor = enemy.state === EnemyState.CHASE 
    ? COLORS.visionConeAlert 
    : COLORS.visionCone;
  gradient.addColorStop(0, baseColor);
  gradient.addColorStop(1, 'transparent');
  ctx.fillStyle = gradient;
  ctx.fill();

  // Vision cone edge
  ctx.strokeStyle = COLORS.visionEdge;
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.restore();
}

function renderHearingRadius(
  ctx: CanvasRenderingContext2D,
  enemy: { pos: { x: number; y: number } },
  hearingRadius: number,
  tileSize: number
): void {
  const px = enemy.pos.x * tileSize;
  const py = enemy.pos.y * tileSize;
  const radius = hearingRadius * tileSize;

  ctx.strokeStyle = COLORS.hearingRadius;
  ctx.setLineDash([5, 5]);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(px, py, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
}

function renderNoiseMarker(
  ctx: CanvasRenderingContext2D,
  noise: { pos: { x: number; y: number }; radius: number; lifetime: number; maxLifetime: number },
  tileSize: number
): void {
  const px = noise.pos.x * tileSize;
  const py = noise.pos.y * tileSize;
  const alpha = noise.lifetime / noise.maxLifetime;
  const radius = noise.radius * tileSize * (1 + (1 - alpha) * 0.5);

  ctx.strokeStyle = `rgba(255, 200, 100, ${alpha * 0.6})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(px, py, radius, 0, Math.PI * 2);
  ctx.stroke();
}
