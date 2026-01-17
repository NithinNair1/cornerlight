// Audio manager for game sounds using Web Audio API
class AudioManager {
  private audioContext: AudioContext | null = null;
  private initialized = false;

  private getContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }
    return this.audioContext;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    const ctx = this.getContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    this.initialized = true;
  }

  // Generate synthetic gunshot sound
  playGunshot(volume: number = 0.5): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    // Create noise for gunshot
    const bufferSize = ctx.sampleRate * 0.15;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      // Noise with exponential decay
      const decay = Math.exp(-i / (ctx.sampleRate * 0.02));
      data[i] = (Math.random() * 2 - 1) * decay;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    // Low-pass filter for bass thump
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(1000, now);
    lowpass.frequency.exponentialRampToValueAtTime(100, now + 0.1);

    // High-pass for crack
    const highpass = ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 500;

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(volume, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    noise.connect(lowpass);
    lowpass.connect(highpass);
    highpass.connect(gainNode);
    gainNode.connect(ctx.destination);

    noise.start(now);
    noise.stop(now + 0.15);
  }

  // Realistic ammo pickup sound - metallic magazine insertion
  playAmmoPickup(): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    // Metallic click/clack sound
    const bufferSize = ctx.sampleRate * 0.12;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    // Initial sharp transient
    for (let i = 0; i < bufferSize; i++) {
      const t = i / ctx.sampleRate;
      // Sharp metallic impact
      const impact = Math.exp(-t * 80) * Math.sin(t * 3500);
      // Secondary resonance
      const resonance = Math.exp(-t * 40) * Math.sin(t * 1800) * 0.3;
      // Subtle rattle
      const rattle = Math.exp(-t * 20) * (Math.random() * 2 - 1) * 0.1;
      data[i] = impact + resonance + rattle;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    // Bandpass for metallic character
    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.value = 2500;
    bandpass.Q.value = 2;

    // High shelf for brightness
    const highShelf = ctx.createBiquadFilter();
    highShelf.type = 'highshelf';
    highShelf.frequency.value = 3000;
    highShelf.gain.value = 4;

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.35, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

    noise.connect(bandpass);
    bandpass.connect(highShelf);
    highShelf.connect(gainNode);
    gainNode.connect(ctx.destination);

    noise.start(now);
    noise.stop(now + 0.12);
  }

  // Level complete sound
  playLevelComplete(): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;

      const gainNode = ctx.createGain();
      const startTime = now + i * 0.15;
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.4);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.4);
    });
  }

  // Level failed sound
  playLevelFailed(): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    const notes = [392, 330, 261.63]; // G4, E4, C4 - descending

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = freq;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 800;

      const gainNode = ctx.createGain();
      const startTime = now + i * 0.2;
      gainNode.gain.setValueAtTime(0.2, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);

      osc.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.3);
    });
  }

  // Enemy death sound
  playEnemyDeath(): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    const bufferSize = ctx.sampleRate * 0.3;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      const decay = Math.exp(-i / (ctx.sampleRate * 0.1));
      data[i] = (Math.random() * 2 - 1) * decay * 0.5;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2000, now);
    filter.frequency.exponentialRampToValueAtTime(200, now + 0.3);

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.3, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    noise.start(now);
    noise.stop(now + 0.3);
  }

  // Realistic bullet impact sound - thuddy with debris
  playBulletImpact(): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    // Initial thump
    const thumpOsc = ctx.createOscillator();
    thumpOsc.type = 'sine';
    thumpOsc.frequency.setValueAtTime(150, now);
    thumpOsc.frequency.exponentialRampToValueAtTime(50, now + 0.04);

    const thumpGain = ctx.createGain();
    thumpGain.gain.setValueAtTime(0.3, now);
    thumpGain.gain.exponentialRampToValueAtTime(0.01, now + 0.04);

    // Debris/crack noise
    const bufferSize = ctx.sampleRate * 0.08;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      const t = i / ctx.sampleRate;
      const decay = Math.exp(-t * 60);
      // Sharper noise with some low frequency content
      data[i] = (Math.random() * 2 - 1) * decay;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    // Lowpass for body
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 3000;

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.2, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

    thumpOsc.connect(thumpGain);
    thumpGain.connect(ctx.destination);

    noise.connect(lowpass);
    lowpass.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    thumpOsc.start(now);
    thumpOsc.stop(now + 0.04);
    noise.start(now);
    noise.stop(now + 0.08);
  }
}

export const audioManager = new AudioManager();
