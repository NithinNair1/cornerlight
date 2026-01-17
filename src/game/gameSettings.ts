// Game settings manager

export interface GameSettings {
  musicEnabled: boolean;
  musicVolume: number;
  fogOfWarEnabled: boolean;
}

const DEFAULT_SETTINGS: GameSettings = {
  musicEnabled: true,
  musicVolume: 0.5,
  fogOfWarEnabled: true,
};

class GameSettingsManager {
  private settings: GameSettings;

  constructor() {
    this.settings = this.loadSettings();
  }

  private loadSettings(): GameSettings {
    try {
      const saved = localStorage.getItem('gameSettings');
      if (saved) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      }
    } catch {
      // Ignore parse errors
    }
    return { ...DEFAULT_SETTINGS };
  }

  private saveSettings(): void {
    localStorage.setItem('gameSettings', JSON.stringify(this.settings));
  }

  get<K extends keyof GameSettings>(key: K): GameSettings[K] {
    return this.settings[key];
  }

  set<K extends keyof GameSettings>(key: K, value: GameSettings[K]): void {
    this.settings[key] = value;
    this.saveSettings();
  }

  getAll(): GameSettings {
    return { ...this.settings };
  }

  reset(): void {
    this.settings = { ...DEFAULT_SETTINGS };
    this.saveSettings();
  }
}

export const gameSettings = new GameSettingsManager();
