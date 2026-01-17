// Music Manager for background music with crossfade support
const MENU_MUSIC_PATH = '/music/menu-theme.mp3';
const GAME_MUSIC_PATH = '/music/game-theme.mp3';
const CROSSFADE_DURATION = 1500; // 1.5 seconds for smooth transition

class MusicManager {
  private menuAudio: HTMLAudioElement | null = null;
  private gameAudio: HTMLAudioElement | null = null;
  private currentTrack: 'menu' | 'game' | null = null;
  private enabled: boolean = true;
  private volume: number = 0.5;
  private initialized: boolean = false;
  private fadeInterval: number | null = null;

  constructor() {
    // Load settings from localStorage
    const savedEnabled = localStorage.getItem('musicEnabled');
    this.enabled = savedEnabled !== 'false';
    
    const savedVolume = localStorage.getItem('musicVolume');
    if (savedVolume) {
      this.volume = parseFloat(savedVolume);
    }
  }

  private initAudio(): void {
    if (this.initialized) return;
    
    this.menuAudio = this.createAudio(MENU_MUSIC_PATH);
    this.gameAudio = this.createAudio(GAME_MUSIC_PATH);
    this.initialized = true;
  }

  private createAudio(src: string): HTMLAudioElement {
    const audio = new Audio(src);
    audio.loop = true;
    audio.volume = 0;
    return audio;
  }

  private clearFade(): void {
    if (this.fadeInterval !== null) {
      clearInterval(this.fadeInterval);
      this.fadeInterval = null;
    }
  }

  private crossfade(fadeIn: HTMLAudioElement | null, fadeOut: HTMLAudioElement | null): void {
    this.clearFade();
    
    const steps = 30;
    const stepDuration = CROSSFADE_DURATION / steps;
    let step = 0;
    
    // Start the new track at volume 0
    if (fadeIn) {
      fadeIn.volume = 0;
      fadeIn.play().catch(() => {});
    }
    
    this.fadeInterval = window.setInterval(() => {
      step++;
      const progress = step / steps;
      
      // Ease in/out curve for smoother transition
      const easeProgress = progress < 0.5 
        ? 2 * progress * progress 
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      
      if (fadeIn) {
        fadeIn.volume = Math.min(this.volume, easeProgress * this.volume);
      }
      if (fadeOut) {
        fadeOut.volume = Math.max(0, (1 - easeProgress) * this.volume);
      }
      
      if (step >= steps) {
        this.clearFade();
        if (fadeOut) {
          fadeOut.pause();
          fadeOut.currentTime = 0;
        }
        if (fadeIn) {
          fadeIn.volume = this.volume;
        }
      }
    }, stepDuration);
  }

  setMusicSource(menuSrc: string, gameSrc?: string): void {
    this.menuAudio = this.createAudio(menuSrc);
    this.gameAudio = gameSrc ? this.createAudio(gameSrc) : this.createAudio(menuSrc);
  }

  playMenu(): void {
    if (!this.enabled) return;
    this.initAudio();

    // If we're already on the menu track, ensure it's actually playing
    if (this.currentTrack === 'menu') {
      this.resume();
      return;
    }

    const fadeOut = this.currentTrack === 'game' ? this.gameAudio : null;
    this.crossfade(this.menuAudio, fadeOut);
    this.currentTrack = 'menu';
  }

  playGame(): void {
    if (!this.enabled) return;
    this.initAudio();

    // If we're already on the game track, ensure it's actually playing
    if (this.currentTrack === 'game') {
      this.resume();
      return;
    }

    const fadeOut = this.currentTrack === 'menu' ? this.menuAudio : null;
    this.crossfade(this.gameAudio, fadeOut);
    this.currentTrack = 'game';
  }

  stopAll(): void {
    this.clearFade();
    if (this.menuAudio) {
      this.menuAudio.pause();
      this.menuAudio.currentTime = 0;
      this.menuAudio.volume = 0;
    }
    if (this.gameAudio) {
      this.gameAudio.pause();
      this.gameAudio.currentTime = 0;
      this.gameAudio.volume = 0;
    }
    this.currentTrack = null;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    localStorage.setItem('musicEnabled', String(enabled));
    
    if (!enabled) {
      this.stopAll();
    } else if (this.currentTrack === 'menu') {
      this.menuAudio!.volume = this.volume;
      this.menuAudio?.play().catch(() => {});
    } else if (this.currentTrack === 'game') {
      this.gameAudio!.volume = this.volume;
      this.gameAudio?.play().catch(() => {});
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    localStorage.setItem('musicVolume', String(this.volume));
    
    // Only update volume of currently playing track
    if (this.currentTrack === 'menu' && this.menuAudio) {
      this.menuAudio.volume = this.volume;
    } else if (this.currentTrack === 'game' && this.gameAudio) {
      this.gameAudio.volume = this.volume;
    }
  }

  getVolume(): number {
    return this.volume;
  }

  // Resume after user interaction (for autoplay policy)
  resume(): void {
    if (!this.enabled) return;

    // Make sure audio elements exist even if resume is called early
    this.initAudio();

    if (this.currentTrack === 'menu' && this.menuAudio) {
      this.menuAudio.volume = this.volume;
      this.menuAudio.play().catch(() => {});
    } else if (this.currentTrack === 'game' && this.gameAudio) {
      this.gameAudio.volume = this.volume;
      this.gameAudio.play().catch(() => {});
    }
  }
}

export const musicManager = new MusicManager();
