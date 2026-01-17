import React, { useState, useCallback } from 'react';
import { MainMenu, GameMode } from './MainMenu';
import { LevelEditor } from './LevelEditor';
import { GameCanvas } from './GameCanvas';
import { GameUI } from './GameUI';
import { GameState } from '@/game/types';
import { LevelData } from '@/game/levelData';

export const GameApp: React.FC = () => {
  const [currentMode, setCurrentMode] = useState<GameMode>('menu');
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [gameKey, setGameKey] = useState(0);
  const [currentLevel, setCurrentLevel] = useState<LevelData | null>(null);

  const handleStartGame = useCallback((mode: GameMode, levelData?: LevelData) => {
    setCurrentLevel(levelData || null);
    setCurrentMode(mode);
    setGameKey(prev => prev + 1);
  }, []);

  const handleRestart = useCallback(() => {
    setGameKey(prev => prev + 1);
  }, []);

  const handleBackToMenu = useCallback(() => {
    setCurrentMode('menu');
    setCurrentLevel(null);
    setGameState(null);
  }, []);

  const handlePlayTest = useCallback((level: LevelData) => {
    setCurrentLevel(level);
    setCurrentMode('play-custom');
    setGameKey(prev => prev + 1);
  }, []);

  if (currentMode === 'menu') {
    return <MainMenu onStartGame={handleStartGame} />;
  }

  if (currentMode === 'editor') {
    return (
      <LevelEditor 
        onBack={handleBackToMenu}
        onPlayTest={handlePlayTest}
      />
    );
  }

  // Play modes
  return (
    <div className="game-container w-screen h-screen relative overflow-hidden">
      <GameCanvas 
        key={gameKey}
        onGameStateChange={setGameState}
        customLevel={currentLevel}
        useRandomLevel={currentMode === 'play-random'}
        onBackToMenu={handleBackToMenu}
      />
      <GameUI 
        gameState={gameState}
        onRestart={handleRestart}
        onBackToMenu={handleBackToMenu}
        levelName={currentLevel?.name}
        levelAuthor={currentLevel?.author}
      />
      
      {/* Scanline effect */}
      <div className="scanlines absolute inset-0 pointer-events-none opacity-30" />
    </div>
  );
};
