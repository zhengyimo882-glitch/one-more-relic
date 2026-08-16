export type ShopSfxCue =
  | 'interact'
  | 'dialogue'
  | 'choice-move'
  | 'choice-confirm'
  | 'place-tally'
  | 'place-tools'
  | 'place-relic'
  | 'transition';

export type ShopVoiceRole = 'shopkeeper' | 'player';

type BrowserAudioContextConstructor = new () => AudioContext;

/** Local-only shop audio: tiny WebAudio cues plus browser English speech voices. */
export class ShopAudioSystem {
  private context?: AudioContext;
  private noiseBuffer?: AudioBuffer;
  private disposed = false;
  private voices: SpeechSynthesisVoice[] = [];
  private lastRestorationAt = 0;

  constructor() {
    this.refreshVoices();
    window.speechSynthesis?.addEventListener('voiceschanged', this.refreshVoices);
  }

  ensureStarted(): void {
    if (this.disposed) {
      return;
    }
    if (!this.context) {
      const audioWindow = window as typeof window & {
        webkitAudioContext?: BrowserAudioContextConstructor;
      };
      const AudioContextClass = window.AudioContext ?? audioWindow.webkitAudioContext;
      if (AudioContextClass) {
        this.context = new AudioContextClass();
        this.createNoiseBuffer();
      }
    }
    if (this.context?.state === 'suspended') {
      void this.context.resume().catch(() => undefined);
    }
  }

  playSfx(cue: ShopSfxCue): void {
    this.ensureStarted();
    if (!this.context || this.context.state !== 'running') {
      return;
    }
    const now = this.context.currentTime;

    if (cue === 'place-tally' || cue === 'place-tools' || cue === 'place-relic') {
      this.playWoodTap(now, cue === 'place-tally' ? 510 : cue === 'place-tools' ? 260 : 390);
      return;
    }
    if (cue === 'transition') {
      this.playTone(now, 164, 92, 0.52, 0.045, 'triangle');
      return;
    }

    const tones: Record<Exclude<ShopSfxCue, 'place-tally' | 'place-tools' | 'place-relic' | 'transition'>, [number, number, number]> = {
      interact: [290, 390, 0.11],
      dialogue: [186, 224, 0.075],
      'choice-move': [310, 355, 0.07],
      'choice-confirm': [360, 520, 0.14],
    };
    const [start, end, duration] = tones[cue];
    this.playTone(now, start, end, duration, 0.025, 'sine');
  }

  playRestorationFriction(tool: 'soft-brush' | 'bamboo-pick' | 'dry-cloth', dirt: string, damaged: boolean): void {
    this.ensureStarted();
    if (!this.context || this.context.state !== 'running') return;
    const now = this.context.currentTime;
    if (!damaged && now - this.lastRestorationAt < 0.12) return;
    this.lastRestorationAt = now;
    if (damaged) {
      this.playTone(now, tool === 'bamboo-pick' ? 1320 : 610, 220, 0.11, 0.042, 'sawtooth');
      return;
    }
    if (!this.noiseBuffer) return;
    const source = this.context.createBufferSource(); source.buffer = this.noiseBuffer;
    const filter = this.context.createBiquadFilter(); filter.type = 'bandpass';
    filter.frequency.value = tool === 'soft-brush' ? 920 : tool === 'bamboo-pick' ? 1540 : 520;
    filter.Q.value = dirt === 'hard-corrosion' ? 2.8 : 1.25;
    const gain = this.context.createGain();
    gain.gain.setValueAtTime(tool === 'bamboo-pick' ? 0.018 : 0.012, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.065);
    source.connect(filter).connect(gain).connect(this.context.destination);
    source.start(now); source.stop(now + 0.075);
  }

  speakEnglish(text: string, role: ShopVoiceRole): void {
    if (this.disposed || !('speechSynthesis' in window)) {
      return;
    }
    const cleanText = this.cleanSpeechText(text);
    if (!cleanText) {
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'en-US';
    utterance.rate = role === 'shopkeeper' ? 0.82 : 0.94;
    utterance.pitch = role === 'shopkeeper' ? 0.72 : 1.02;
    utterance.volume = 0.92;
    const voice = this.pickVoice(role);
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    }
    window.speechSynthesis.speak(utterance);
  }

  stopVoice(): void {
    window.speechSynthesis?.cancel();
  }

  destroy(): void {
    this.disposed = true;
    this.stopVoice();
    window.speechSynthesis?.removeEventListener('voiceschanged', this.refreshVoices);
    if (this.context && this.context.state !== 'closed') {
      void this.context.close().catch(() => undefined);
    }
    this.context = undefined;
    this.noiseBuffer = undefined;
  }

  private readonly refreshVoices = (): void => {
    this.voices = window.speechSynthesis?.getVoices() ?? [];
  };

  private pickVoice(role: ShopVoiceRole): SpeechSynthesisVoice | undefined {
    const english = this.voices.filter((voice) => /^en([-_]|$)/i.test(voice.lang));
    const preferredNames = role === 'shopkeeper'
      ? ['david', 'george', 'daniel', 'arthur', 'guy', 'male']
      : ['zira', 'samantha', 'jenny', 'aria', 'female'];
    return english.find((voice) =>
      preferredNames.some((name) => voice.name.toLowerCase().includes(name)))
      ?? english[role === 'shopkeeper' ? 0 : Math.min(1, english.length - 1)];
  }

  private cleanSpeechText(text: string): string {
    return text
      .replace(/\n+/g, '. ')
      .replace(/[“”‘’]/g, '')
      .replace(/[^\x20-\x7E]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private playTone(
    now: number,
    startFrequency: number,
    endFrequency: number,
    duration: number,
    volume: number,
    type: OscillatorType,
  ): void {
    if (!this.context) {
      return;
    }
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(startFrequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(endFrequency, now + duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain).connect(this.context.destination);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  }

  private playWoodTap(now: number, frequency: number): void {
    if (!this.context) {
      return;
    }
    this.playTone(now, frequency, frequency * 0.52, 0.12, 0.045, 'triangle');
    if (!this.noiseBuffer) {
      return;
    }
    const source = this.context.createBufferSource();
    source.buffer = this.noiseBuffer;
    const filter = this.context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = frequency * 1.7;
    filter.Q.value = 1.2;
    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0.038, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.085);
    source.connect(filter).connect(gain).connect(this.context.destination);
    source.start(now);
    source.stop(now + 0.1);
  }

  private createNoiseBuffer(): void {
    if (!this.context) {
      return;
    }
    const length = Math.floor(this.context.sampleRate * 0.12);
    const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    let seed = 419;
    for (let index = 0; index < length; index += 1) {
      seed = (seed * 16807) % 2147483647;
      data[index] = (seed / 2147483647) * 2 - 1;
    }
    this.noiseBuffer = buffer;
  }
}
