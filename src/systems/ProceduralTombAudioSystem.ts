export type TombAudioCue =
  | 'pickup'
  | 'place'
  | 'correct'
  | 'wrong'
  | 'lamp-on'
  | 'lamp-off'
  | 'door-reject'
  | 'door-unlock';

type BrowserAudioContextConstructor = new () => AudioContext;

export class ProceduralTombAudioSystem {
  private context?: AudioContext;
  private ambientOscillators: OscillatorNode[] = [];
  private ambientGain?: GainNode;
  private noiseBuffer?: AudioBuffer;
  private disposed = false;

  ensureStarted(): void {
    if (this.disposed) {
      return;
    }
    if (!this.context) {
      const audioWindow = window as typeof window & {
        webkitAudioContext?: BrowserAudioContextConstructor;
      };
      const AudioContextClass = window.AudioContext ?? audioWindow.webkitAudioContext;
      if (!AudioContextClass) {
        return;
      }
      this.context = new AudioContextClass();
      this.createNoiseBuffer();
      this.startAmbientBed();
    }
    if (this.context.state === 'suspended') {
      void this.context.resume().catch(() => undefined);
    }
  }

  playFootstep(
    kind: 'player' | 'echo' | 'follower',
    worldX: number,
    worldY: number,
    listenerX: number,
    listenerY: number,
  ): void {
    this.ensureStarted();
    if (!this.context || !this.noiseBuffer || this.context.state !== 'running') {
      return;
    }

    const distance = Math.hypot(worldX - listenerX, worldY - listenerY);
    const distanceGain = Math.max(0.18, 1 - distance / 740);
    const baseGain = kind === 'player' ? 0.035 : kind === 'echo' ? 0.052 : 0.09;
    const pan = Math.max(-0.9, Math.min(0.9, (worldX - listenerX) / 420));
    const now = this.context.currentTime;

    const noise = this.context.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(kind === 'follower' ? 190 : 280, now);
    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(baseGain * distanceGain, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + (kind === 'follower' ? 0.2 : 0.13));
    const panner = this.context.createStereoPanner();
    panner.pan.setValueAtTime(pan, now);
    noise.connect(filter).connect(gain).connect(panner).connect(this.context.destination);
    noise.start(now);
    noise.stop(now + 0.22);

    const thud = this.context.createOscillator();
    const thudGain = this.context.createGain();
    thud.type = 'sine';
    thud.frequency.setValueAtTime(kind === 'follower' ? 58 : 78, now);
    thud.frequency.exponentialRampToValueAtTime(38, now + 0.13);
    thudGain.gain.setValueAtTime(baseGain * distanceGain * 0.7, now);
    thudGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
    thud.connect(thudGain).connect(panner);
    thud.start(now);
    thud.stop(now + 0.16);
  }

  playCue(cue: TombAudioCue): void {
    this.ensureStarted();
    if (!this.context || this.context.state !== 'running') {
      return;
    }
    const frequencies: Record<TombAudioCue, [number, number]> = {
      pickup: [126, 188],
      place: [154, 112],
      correct: [196, 392],
      wrong: [92, 54],
      'lamp-on': [310, 470],
      'lamp-off': [260, 120],
      'door-reject': [74, 48],
      'door-unlock': [220, 330],
    };
    const [startFrequency, endFrequency] = frequencies[cue];
    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = cue === 'wrong' || cue === 'door-reject' ? 'sawtooth' : 'sine';
    oscillator.frequency.setValueAtTime(startFrequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(endFrequency, now + 0.18);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.055, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
    oscillator.connect(gain).connect(this.context.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.3);
  }

  setAmbientMuted(muted: boolean): void {
    if (!this.context || !this.ambientGain) {
      return;
    }
    const now = this.context.currentTime;
    this.ambientGain.gain.cancelScheduledValues(now);
    this.ambientGain.gain.linearRampToValueAtTime(muted ? 0.0001 : 0.007, now + 0.12);
  }

  destroy(): void {
    this.disposed = true;
    this.ambientOscillators.forEach((oscillator) => {
      try {
        oscillator.stop();
      } catch {
        // Oscillator may already have been stopped by a browser context shutdown.
      }
    });
    this.ambientOscillators = [];
    if (this.context && this.context.state !== 'closed') {
      void this.context.close().catch(() => undefined);
    }
    this.context = undefined;
  }

  private createNoiseBuffer(): void {
    if (!this.context) {
      return;
    }
    const length = Math.floor(this.context.sampleRate * 0.25);
    const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    let seed = 731;
    for (let index = 0; index < length; index += 1) {
      seed = (seed * 16807) % 2147483647;
      data[index] = (seed / 2147483647) * 2 - 1;
    }
    this.noiseBuffer = buffer;
  }

  private startAmbientBed(): void {
    if (!this.context) {
      return;
    }
    const gain = this.context.createGain();
    gain.gain.value = 0.007;
    gain.connect(this.context.destination);
    for (const [frequency, type] of [[43, 'sine'], [67, 'triangle']] as const) {
      const oscillator = this.context.createOscillator();
      oscillator.type = type;
      oscillator.frequency.value = frequency;
      oscillator.connect(gain);
      oscillator.start();
      this.ambientOscillators.push(oscillator);
    }
    this.ambientGain = gain;
  }
}

