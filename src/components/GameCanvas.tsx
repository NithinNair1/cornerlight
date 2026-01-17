import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GameState, InputState } from '@/game/types';
import { DEFAULT_CONFIG, COMBAT_CONFIG } from '@/game/config';
import { generateLevel } from '@/game/levelGenerator';
import { renderGame } from '@/game/renderer';
import { updateGame } from '@/game/gameLoop';
import { audioManager } from '@/game/audio';
import { LevelData, levelDataToGameData } from '@/game/levelData';
import { findSafeSpawnPos, findSafeEntityPos } from '@/game/spawnSafety';
import { musicManager } from '@/game/musicManager';
import { gameSettings } from '@/game/gameSettings';

interface GameCanvasProps {
  onGameStateChange?: (state: GameState) => void;
  customLevel?: LevelData | null;
  useRandomLevel?: boolean;
  onBackToMenu?: () => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({ 
  onGameStateChange,
  customLevel,
  useRandomLevel = true,
  onBackToMenu,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameStateRef = useRef<GameState | null>(null);
  const inputRef = useRef<InputState>({
    up: false,
    down: false,
    left: false,
    right: false,
    sprint: false,
    sneak: false,
    interact: false,
    shoot: false,
    mousePos: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
    mouseDown: false,
  });
  const canvasSizeRef = useRef({ width: window.innerWidth, height: window.innerHeight });
  const [isInitialized, setIsInitialized] = useState(false);
  const lastTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number>(0);

  const initGame = useCallback((seed?: number) => {
    let grid, spawnPos, enemies, ammoPickups;
    let config = { ...DEFAULT_CONFIG, seed: seed ?? Date.now() };

    if (customLevel && !useRandomLevel) {
      // Use custom level data
      const levelData = levelDataToGameData(customLevel);
      grid = levelData.grid;
      spawnPos = customLevel.spawnPos;
      enemies = levelData.enemies;
      ammoPickups = levelData.ammoPickups;
      config = { ...config, gridWidth: customLevel.gridWidth, gridHeight: customLevel.gridHeight };
    } else {
      // Generate random level
      const generated = generateLevel(config);
      grid = generated.grid;
      spawnPos = generated.spawnPos;
      enemies = generated.enemies;
      ammoPickups = generated.ammoPickups;
    }

    // Safety: never spawn inside/against walls.
    // - player needs 3x3 clearance because we use a collision radius.
    // - enemies just need to not start inside a wall.
    const safePlayerSpawn = findSafeSpawnPos(grid, spawnPos, { requireClear3x3: true });
    const safeEnemies = enemies.map(e => ({ ...e, pos: findSafeEntityPos(grid, e.pos) }));

    // Initialize explored tiles for fog of war
    const exploredTiles: boolean[][] = grid.map(row => row.map(() => false));
    
    // Reveal initial area around spawn
    const revealRadius = 5;
    const px = Math.floor(safePlayerSpawn.x);
    const py = Math.floor(safePlayerSpawn.y);
    for (let dy = -revealRadius; dy <= revealRadius; dy++) {
      for (let dx = -revealRadius; dx <= revealRadius; dx++) {
        const tx = px + dx;
        const ty = py + dy;
        if (ty >= 0 && ty < grid.length && tx >= 0 && tx < grid[0].length) {
          exploredTiles[ty][tx] = true;
        }
      }
    }

    const initialState: GameState = {
      player: {
        pos: { x: safePlayerSpawn.x, y: safePlayerSpawn.y },
        angle: 0,
        isSprinting: false,
        isSneaking: false,
        speed: config.playerWalkSpeed,
        noiseLevel: 0,
        ammo: COMBAT_CONFIG.playerStartAmmo,
        maxAmmo: COMBAT_CONFIG.playerMaxAmmo,
        health: COMBAT_CONFIG.playerHealth,
        maxHealth: COMBAT_CONFIG.playerHealth,
        shootCooldown: 0,
      },
      enemies: safeEnemies,
      grid,
      config,
      isGameOver: false,
      isWin: false,
      isPaused: false,
      debugMode: true,
      detectionLevel: 0,
      noiseMarkers: [],
      bullets: [],
      ammoPickups,
      nextBulletId: 0,
      exploredTiles,
    };

    gameStateRef.current = initialState;
    onGameStateChange?.(initialState);
    setIsInitialized(true);
  }, [onGameStateChange, customLevel, useRandomLevel]);

  const restart = useCallback(() => {
    initGame();
  }, [initGame]);

  const toggleDebug = useCallback(() => {
    if (gameStateRef.current) {
      gameStateRef.current.debugMode = !gameStateRef.current.debugMode;
    }
  }, []);

  // Start game music and initialize
  useEffect(() => {
    initGame();
    musicManager.playGame();
    return () => {
      // Don't stop music on unmount; the next screen will crossfade to its track
    };
  }, [initGame]);

  // Input handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Initialize audio on first interaction
      audioManager.initialize();
      musicManager.resume();
      
      const input = inputRef.current;
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          input.up = true;
          break;
        case 'KeyS':
        case 'ArrowDown':
          input.down = true;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          input.left = true;
          break;
        case 'KeyD':
        case 'ArrowRight':
          input.right = true;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          input.sprint = true;
          break;
        case 'ControlLeft':
        case 'ControlRight':
          input.sneak = true;
          break;
        case 'KeyE':
          input.interact = true;
          break;
        case 'Space':
          input.shoot = true;
          break;
        case 'KeyR':
          restart();
          break;
        case 'Tab':
          e.preventDefault();
          toggleDebug();
          break;
        case 'Escape':
          onBackToMenu?.();
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const input = inputRef.current;
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          input.up = false;
          break;
        case 'KeyS':
        case 'ArrowDown':
          input.down = false;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          input.left = false;
          break;
        case 'KeyD':
        case 'ArrowRight':
          input.right = false;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          input.sprint = false;
          break;
        case 'ControlLeft':
        case 'ControlRight':
          input.sneak = false;
          break;
      }
    };

    const handleMouseDown = () => {
      audioManager.initialize();
      musicManager.resume();
      inputRef.current.shoot = true;
    };

    const handleMouseUp = () => {
      inputRef.current.shoot = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      inputRef.current.mousePos = { x: e.clientX, y: e.clientY };
      
      // Update player angle based on mouse position relative to center of screen
      if (gameStateRef.current) {
        const centerX = canvasSizeRef.current.width / 2;
        const centerY = canvasSizeRef.current.height / 2;
        const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
        gameStateRef.current.player.angle = angle;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [restart, toggleDebug, onBackToMenu]);

  // Game loop
  useEffect(() => {
    if (!isInitialized) return;

    const gameLoop = (timestamp: number) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx || !gameStateRef.current) return;

      // Calculate delta time
      const deltaTime = Math.min((timestamp - lastTimeRef.current) / 1000, 0.1);
      lastTimeRef.current = timestamp;

      // Update game state
      gameStateRef.current = updateGame(
        gameStateRef.current,
        inputRef.current,
        deltaTime
      );

      // Notify parent of state changes
      onGameStateChange?.(gameStateRef.current);

      // Render with fog of war setting
      const fogEnabled = gameSettings.get('fogOfWarEnabled');
      renderGame(ctx, gameStateRef.current, canvas.width, canvas.height, fogEnabled);

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    lastTimeRef.current = performance.now();
    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isInitialized, onGameStateChange]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        canvasSizeRef.current = { width: window.innerWidth, height: window.innerHeight };
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full cursor-crosshair"
      tabIndex={0}
    />
  );
};
