import React, { useState, useCallback } from 'react';
import { GameCanvas } from './GameCanvas';
import { GameUI } from './GameUI';
import { GameState } from '@/game/types';

export const Game: React.FC = () => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [gameKey, setGameKey] = useState(0);

  const handleRestart = useCallback(() => {
    setGameKey(prev => prev + 1);
  }, []);

  return (
    <div className="game-container w-screen h-screen relative overflow-hidden">
      <GameCanvas 
        key={gameKey}
        onGameStateChange={setGameState}
      />
      <GameUI 
        gameState={gameState}
        onRestart={handleRestart}
      />
      
      {/* Scanline effect */}
      <div className="scanlines absolute inset-0 pointer-events-none opacity-30" />
    </div>
  );
};
