import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { GameState } from '@/game/types';
import { Badge } from '@/components/ui/badge';

interface GameUIProps {
  gameState: GameState | null;
  onRestart: () => void;
  onBackToMenu?: () => void;
  levelName?: string;
  levelAuthor?: string;
}

export const GameUI: React.FC<GameUIProps> = ({ 
  gameState, 
  onRestart, 
  onBackToMenu,
  levelName,
  levelAuthor 
}) => {
  if (!gameState) return null;

  const { detectionLevel, isGameOver, isWin, debugMode, player, enemies } = gameState;
  const aliveEnemies = enemies.filter(e => !e.isDead).length;

  return (
    <div className="game-ui">
      {/* HUD */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
        {/* Left panel - Detection & Stats */}
        <div className="flex flex-col gap-3">
          {/* Detection meter */}
          <div className="hud-panel min-w-[200px]">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-2 h-2 rounded-full ${
                detectionLevel >= 100 
                  ? 'bg-game-enemy animate-alert-flash' 
                  : detectionLevel >= 40 
                    ? 'bg-game-alert' 
                    : 'bg-game-player'
              }`} />
              <span className="text-xs uppercase tracking-wider text-muted-foreground">
                {detectionLevel >= 100 ? 'DETECTED' : detectionLevel >= 40 ? 'ALERT' : 'HIDDEN'}
              </span>
            </div>
            <div className="detection-bar">
              <div 
                className="detection-fill"
                style={{ width: `${Math.min(detectionLevel, 100)}%` }}
              />
            </div>
          </div>

          {/* Health */}
          <div className="hud-panel">
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Health</div>
            <div className="flex gap-1">
              {Array.from({ length: player.maxHealth }).map((_, i) => (
                <div
                  key={i}
                  className={`w-6 h-3 rounded-sm ${
                    i < player.health ? 'bg-game-exit' : 'bg-muted/30'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Ammo */}
          <div className="hud-panel">
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Ammo</div>
            <div className="flex items-center gap-2">
              <span className={`font-display text-lg ${player.ammo === 0 ? 'text-game-enemy' : 'text-game-alert'}`}>
                {player.ammo}
              </span>
              <span className="text-muted-foreground text-sm">/ {player.maxAmmo}</span>
            </div>
          </div>

          {/* Enemies remaining */}
          <div className="hud-panel">
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Hostiles</div>
            <span className="font-display text-lg text-game-enemy">{aliveEnemies}</span>
          </div>
        </div>

        {/* Controls info */}
        <div className="hud-panel text-right text-xs">
          <div className="text-muted-foreground mb-1">
            <span className="text-primary">WASD</span> Move
          </div>
          <div className="text-muted-foreground mb-1">
            <span className="text-primary">SHIFT</span> Sprint
          </div>
          <div className="text-muted-foreground mb-1">
            <span className="text-primary">CTRL</span> Sneak
          </div>
          <div className="text-muted-foreground mb-1">
            <span className="text-primary">SPACE/CLICK</span> Shoot
          </div>
          <div className="text-muted-foreground mb-1">
            <span className="text-primary">E</span> Distract
          </div>
          <div className="text-muted-foreground mb-1">
            <span className="text-primary">TAB</span> Debug
          </div>
          <div className="text-muted-foreground">
            <span className="text-primary">R</span> Restart
          </div>
        </div>
      </div>

      {/* Level info and Objective */}
      <div className="absolute bottom-4 left-4 flex flex-col gap-2">
        {levelName && (
          <div className="hud-panel">
            <div className="text-xs text-primary font-semibold">{levelName}</div>
            {levelAuthor && <div className="text-xs text-muted-foreground">by {levelAuthor}</div>}
          </div>
        )}
        <div className="hud-panel">
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Objective</div>
          {aliveEnemies > 0 ? (
            <div className="text-sm text-game-alert flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-game-alert animate-pulse-glow" />
              Eliminate all hostiles ({aliveEnemies} left)
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Badge className="bg-game-exit text-background border-0">
                Success: all hostiles eliminated
              </Badge>
              <span className="text-sm text-game-exit">Locate the exit →</span>
            </div>
          )}
        </div>
      </div>

      {/* Debug indicator and Back button */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-2 items-end">
        {debugMode && (
          <div className="hud-panel text-xs text-game-alert">
            DEBUG MODE
          </div>
        )}
        {onBackToMenu && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onBackToMenu}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Menu
          </Button>
        )}
      </div>

      {/* Game Over overlay */}
      {isGameOver && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm game-ui-interactive">
          <div className="text-center">
            <h2 className="font-display text-4xl text-game-enemy mb-4 neon-text">
              MISSION FAILED
            </h2>
            <p className="text-muted-foreground mb-6">You were eliminated</p>
            <button
              onClick={onRestart}
              className="px-6 py-3 bg-game-enemy text-white font-display uppercase tracking-wider hover:scale-105 transition-transform"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Win overlay */}
      {isWin && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm game-ui-interactive">
          <div className="text-center">
            <h2 className="font-display text-4xl text-game-exit mb-4 neon-text">
              EXTRACTION COMPLETE
            </h2>
            <p className="text-muted-foreground mb-6">You successfully reached the exit</p>
            <button
              onClick={onRestart}
              className="px-6 py-3 bg-game-exit text-background font-display uppercase tracking-wider hover:scale-105 transition-transform"
            >
              Play Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
