import React from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Settings, Volume2, Eye, X } from 'lucide-react';
import { gameSettings } from '@/game/gameSettings';
import { musicManager } from '@/game/musicManager';

interface SettingsMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsMenu: React.FC<SettingsMenuProps> = ({ isOpen, onClose }) => {
  const [musicEnabled, setMusicEnabled] = React.useState(gameSettings.get('musicEnabled'));
  const [musicVolume, setMusicVolume] = React.useState(gameSettings.get('musicVolume'));
  const [fogOfWar, setFogOfWar] = React.useState(gameSettings.get('fogOfWarEnabled'));

  const handleMusicToggle = (enabled: boolean) => {
    setMusicEnabled(enabled);
    gameSettings.set('musicEnabled', enabled);
    musicManager.setEnabled(enabled);
  };

  const handleVolumeChange = (value: number[]) => {
    const vol = value[0];
    setMusicVolume(vol);
    gameSettings.set('musicVolume', vol);
    musicManager.setVolume(vol);
  };

  const handleFogOfWarToggle = (enabled: boolean) => {
    setFogOfWar(enabled);
    gameSettings.set('fogOfWarEnabled', enabled);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-primary flex items-center gap-2">
            <Settings className="w-6 h-6" />
            Settings
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="space-y-6">
          {/* Music Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Volume2 className="w-5 h-5 text-muted-foreground" />
              <span className="text-foreground">Music</span>
            </div>
            <Switch
              checked={musicEnabled}
              onCheckedChange={handleMusicToggle}
            />
          </div>

          {/* Music Volume */}
          {musicEnabled && (
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Volume</label>
              <Slider
                value={[musicVolume]}
                onValueChange={handleVolumeChange}
                min={0}
                max={1}
                step={0.1}
                className="w-full"
              />
            </div>
          )}

          {/* Fog of War Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Eye className="w-5 h-5 text-muted-foreground" />
              <div>
                <span className="text-foreground">Fog of War</span>
                <p className="text-xs text-muted-foreground">Hide unexplored areas</p>
              </div>
            </div>
            <Switch
              checked={fogOfWar}
              onCheckedChange={handleFogOfWarToggle}
            />
          </div>
        </div>

        <div className="mt-8">
          <Button onClick={onClose} className="w-full">
            Done
          </Button>
        </div>
      </div>
    </div>
  );
};
