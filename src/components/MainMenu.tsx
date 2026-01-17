import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Play, Edit3, Users, Code, Settings } from 'lucide-react';
import { decodeLevelFromString, SAMPLE_LEVELS, LevelData } from '@/game/levelData';
import { toast } from 'sonner';
import { SettingsMenu } from './SettingsMenu';
import { musicManager } from '@/game/musicManager';

export type GameMode = 'menu' | 'play-random' | 'play-custom' | 'editor' | 'browse';

interface MainMenuProps {
  onStartGame: (mode: GameMode, levelData?: LevelData) => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({ onStartGame }) => {
  const [showLevelCode, setShowLevelCode] = useState(false);
  const [levelCode, setLevelCode] = useState('');
  const [showBrowse, setShowBrowse] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const [musicStarted, setMusicStarted] = useState(false);

  // Start menu music on mount
  useEffect(() => {
    musicManager.playMenu();
    
    // Handle X key to start music
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyX') {
        musicManager.resume();
        setMusicStarted(true);
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleLoadLevel = () => {
    if (!levelCode.trim()) {
      toast.error('Please enter a level code');
      return;
    }
    
    const level = decodeLevelFromString(levelCode.trim());
    if (!level) {
      toast.error('Invalid level code');
      return;
    }
    
    toast.success(`Loading "${level.name}" by ${level.author}`);
    onStartGame('play-custom', level);
  };

  const handlePlaySampleLevel = (level: LevelData) => {
    onStartGame('play-custom', level);
  };

  if (showBrowse) {
    return (
      <div className="w-screen h-screen bg-background flex flex-col items-center justify-center p-8">
        <div className="max-w-2xl w-full">
          <h2 className="text-3xl font-bold text-primary mb-6 text-center">Community Levels</h2>
          
          <div className="space-y-4 mb-8">
            {SAMPLE_LEVELS.map((level, i) => (
              <div 
                key={i}
                className="bg-card border border-border rounded-lg p-4 flex justify-between items-center hover:border-primary transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-semibold text-foreground">{level.name}</h3>
                    {level.isFeatured && (
                      <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 text-xs">
                        ⭐ Featured
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">by {level.author}</p>
                  <p className="text-xs text-muted-foreground">
                    {level.gridWidth}x{level.gridHeight} • {level.enemySpawns.length} enemies
                  </p>
                </div>
                <Button 
                  onClick={() => handlePlaySampleLevel(level)}
                  className="bg-primary hover:bg-primary/80"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Play
                </Button>
              </div>
            ))}
            
            {SAMPLE_LEVELS.length === 0 && (
              <p className="text-center text-muted-foreground">No community levels yet. Create one!</p>
            )}
          </div>
          
          <div className="flex justify-center">
            <Button 
              variant="outline" 
              onClick={() => setShowBrowse(false)}
              className="border-border"
            >
              Back to Menu
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen bg-background flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background grid effect */}
      <div className="absolute inset-0 opacity-10">
        <div 
          className="w-full h-full"
          style={{
            backgroundImage: 'linear-gradient(hsl(var(--primary) / 0.3) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary) / 0.3) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      {/* Main content */}
      <div className="relative z-10 text-center">
        <h1 className="text-6xl font-black text-primary mb-2 tracking-tighter">
          CORNERLIGHT
        </h1>
        <p className="text-muted-foreground mb-12 text-lg">
          Top-Down Stealth Shooter
        </p>

        <div className="space-y-4 max-w-xs mx-auto">
          <Button 
            onClick={() => onStartGame('play-random')}
            className="w-full h-14 text-lg bg-primary hover:bg-primary/80 text-primary-foreground"
          >
            <Play className="w-5 h-5 mr-3" />
            Quick Play
          </Button>

          <Button 
            onClick={() => onStartGame('editor')}
            variant="outline"
            className="w-full h-14 text-lg border-primary/50 hover:bg-primary/10"
          >
            <Edit3 className="w-5 h-5 mr-3" />
            Create Level
          </Button>

          <Button 
            onClick={() => setShowBrowse(true)}
            variant="outline"
            className="w-full h-14 text-lg border-border hover:bg-muted"
          >
            <Users className="w-5 h-5 mr-3" />
            Browse Levels
          </Button>

          <Button 
            onClick={() => setShowLevelCode(!showLevelCode)}
            variant="ghost"
            className="w-full h-12 text-muted-foreground hover:text-foreground"
          >
            <Code className="w-4 h-4 mr-2" />
            Load Level Code
          </Button>

          <Button 
            onClick={() => setShowSettings(true)}
            variant="ghost"
            className="w-full h-12 text-muted-foreground hover:text-foreground"
          >
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>

          {showLevelCode && (
            <div className="space-y-2 pt-2">
              <Input
                value={levelCode}
                onChange={(e) => setLevelCode(e.target.value)}
                placeholder="Paste level code here..."
                className="bg-card border-border text-foreground"
              />
              <Button 
                onClick={handleLoadLevel}
                className="w-full bg-accent hover:bg-accent/80"
              >
                Load & Play
              </Button>
            </div>
          )}
        </div>

        {/* Controls hint */}
        <div className="mt-16 text-xs text-muted-foreground space-y-1">
          <p><span className="text-primary">WASD</span> Move | <span className="text-primary">Shift</span> Sprint | <span className="text-primary">Ctrl</span> Sneak</p>
          <p><span className="text-primary">E</span> Distract | <span className="text-primary">Space/Click</span> Shoot | <span className="text-primary">Tab</span> Debug</p>
        </div>
      </div>

      {/* Bottom info */}
      <div className="absolute bottom-4 left-4">
        {!musicStarted && (
          <Badge variant="outline" className="text-xs text-muted-foreground border-muted-foreground/30">
            Press <span className="text-primary font-bold mx-1">X</span> to play background music
          </Badge>
        )}
      </div>
      <div className="absolute bottom-4 right-4 text-xs text-muted-foreground">
        v0.3.0
      </div>

      {/* Settings Modal */}
      <SettingsMenu isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
};
