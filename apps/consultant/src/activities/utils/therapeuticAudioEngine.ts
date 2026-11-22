// Hexpertify Realistic Sound Effects & Voice Guidance Engine (Web Audio API + Web Speech API)

class TherapeuticAudioEngine {
  private ctx: AudioContext | null = null;
  public soundEnabled: boolean = true;
  public voiceEnabled: boolean = true;
  private voices: SpeechSynthesisVoice[] = [];
  private activeUtterance: SpeechSynthesisUtterance | null = null;
  private pendingSpeakTimeout: any = null;

  // Bookmarking state for resuming speech from the exact paused word/sentence
  private currentFullText: string = '';
  private currentSpokenCharIndex: number = 0;
  private isCurrentSpeechCompleted: boolean = true;
  private currentCustomRate: number = 1.0;
  private speechStartTime: number = 0;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.initVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = () => this.initVoices();
      }
    }
  }

  private initVoices() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.voices = window.speechSynthesis.getVoices() || [];
    }
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public setVoiceEnabled(enabled: boolean) {
    this.voiceEnabled = enabled;
    if (!enabled) {
      this.pauseSpeaking();
    }
  }

  public setSoundEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
    if (!enabled) {
      this.stopSpeaking();
    }
  }

  // 1. Spoken Voice Guidance Coach (Web Speech Synthesis API) - Calmed, synchronized therapeutic cadence
  public speak(
    text: string,
    priorityOrCallback?: boolean | (() => void),
    customRate: number = 1.0,
    startCharOffset: number = 0,
    onComplete?: () => void
  ) {
    let priority = false;
    let completeCallback = onComplete;
    if (typeof priorityOrCallback === 'function') {
      completeCallback = priorityOrCallback;
      priority = false;
    } else if (typeof priorityOrCallback === 'boolean') {
      priority = priorityOrCallback;
    }

    if (!this.voiceEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      this.stopSpeaking();
      if (completeCallback) completeCallback();
      return;
    }

    // Cancel any current utterance and pending timeout immediately
    this.stopRawSpeech();

    if (!this.voiceEnabled) {
      if (completeCallback) completeCallback();
      return;
    }

    if (startCharOffset === 0) {
      this.currentFullText = text;
      this.currentCustomRate = customRate;
      this.currentSpokenCharIndex = 0;
      this.isCurrentSpeechCompleted = false;
    }

    const textToSpeak = startCharOffset > 0 ? text.slice(startCharOffset).trim() : text;
    if (!textToSpeak) {
      this.isCurrentSpeechCompleted = true;
      if (completeCallback) completeCallback();
      return;
    }

    try {
      if (this.voices.length === 0) {
        this.initVoices();
      }

      // Resume if paused (browser bug workaround)
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      this.activeUtterance = utterance;
      (window as any).__lastUtterance = utterance;

      // Select warm, natural english voice
      const naturalVoice =
        this.voices.find(
          (v) =>
            (v.name.includes('Natural') ||
              v.name.includes('Google') ||
              v.name.includes('Samantha') ||
              v.name.includes('Karen') ||
              v.name.includes('Female')) &&
            v.lang.startsWith('en')
        ) || this.voices.find((v) => v.lang.startsWith('en'));

      if (naturalVoice) {
        utterance.voice = naturalVoice;
      }

      // Clear, synchronized pacing
      utterance.rate = Math.max(0.9, Math.min(customRate, 1.15));
      utterance.pitch = 1.0; // Warm, natural pitch
      utterance.volume = 0.95;

      utterance.onstart = () => {
        this.speechStartTime = Date.now();
      };

      utterance.onboundary = (e: SpeechSynthesisEvent) => {
        if (typeof e.charIndex === 'number') {
          this.currentSpokenCharIndex = startCharOffset + e.charIndex;
        }
      };

      utterance.onend = () => {
        this.isCurrentSpeechCompleted = true;
        this.currentSpokenCharIndex = this.currentFullText.length;
        if (this.activeUtterance === utterance) {
          this.activeUtterance = null;
        }
        if (completeCallback) {
          try {
            completeCallback();
          } catch (err) {
            console.warn('completeCallback error:', err);
          }
        }
      };

      utterance.onerror = (e) => {
        if (this.activeUtterance === utterance) {
          this.activeUtterance = null;
        }
        if (e.error !== 'canceled' && e.error !== 'interrupted') {
          console.warn('Speech synthesis error:', e.error);
          if (completeCallback) {
            try {
              completeCallback();
            } catch (err) {
              console.warn(err);
            }
          }
        }
      };

      // Small delay to allow previous cancel to settle in Chromium engines
      this.pendingSpeakTimeout = setTimeout(() => {
        this.pendingSpeakTimeout = null;
        try {
          if (this.voiceEnabled && typeof window !== 'undefined' && 'speechSynthesis' in window) {
            window.speechSynthesis.speak(utterance);
          } else if (completeCallback) {
            completeCallback();
          }
        } catch (err) {
          console.warn('Speech speak error:', err);
          if (completeCallback) completeCallback();
        }
      }, 20);
    } catch (e) {
      console.warn('Speech synthesis error:', e);
      if (completeCallback) completeCallback();
    }
  }

  public pauseSpeaking() {
    if (this.activeUtterance && !this.isCurrentSpeechCompleted && this.speechStartTime > 0) {
      const elapsedSeconds = (Date.now() - this.speechStartTime) / 1000;
      const estimatedChars = Math.floor(elapsedSeconds * 15 * this.currentCustomRate);
      if (estimatedChars > this.currentSpokenCharIndex) {
        this.currentSpokenCharIndex = Math.min(this.currentFullText.length, estimatedChars);
      }
    }
    this.stopRawSpeech();
  }

  public resumeSpeaking() {
    if (!this.voiceEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    if (this.isCurrentSpeechCompleted || !this.currentFullText) {
      return;
    }

    let targetIndex = this.currentSpokenCharIndex;
    if (targetIndex > 0 && targetIndex < this.currentFullText.length) {
      while (targetIndex > 0 && this.currentFullText[targetIndex - 1] !== ' ' && this.currentFullText[targetIndex - 1] !== '\n') {
        targetIndex--;
      }
    }

    const remainingText = this.currentFullText.slice(targetIndex).trim();
    if (remainingText.length > 0) {
      this.speak(this.currentFullText, true, this.currentCustomRate, targetIndex);
    } else {
      this.isCurrentSpeechCompleted = true;
    }
  }

  public isSpeechActive(): boolean {
    return !this.isCurrentSpeechCompleted && !!this.currentFullText;
  }

  private stopRawSpeech() {
    if (this.pendingSpeakTimeout) {
      clearTimeout(this.pendingSpeakTimeout);
      this.pendingSpeakTimeout = null;
    }

    if (this.activeUtterance) {
      this.activeUtterance.onend = null;
      this.activeUtterance.onerror = null;
      this.activeUtterance.onstart = null;
      this.activeUtterance.onboundary = null;
      this.activeUtterance.onpause = null;
      this.activeUtterance.onresume = null;
      this.activeUtterance = null;
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        window.speechSynthesis.cancel();
      } catch { }
    }
  }

  public stopSpeaking(clearBookmark: boolean = true) {
    this.stopRawSpeech();
    if (clearBookmark) {
      this.currentFullText = '';
      this.currentSpokenCharIndex = 0;
      this.isCurrentSpeechCompleted = true;
      this.speechStartTime = 0;
    }
  }

  // 2. Procedural Sound Effects Synthesizer (Web Audio API)
  public playSfx(
    type:
      | 'inhale_whoosh'
      | 'exhale_whoosh'
      | 'singing_bowl'
      | 'sonar_ping'
      | 'vault_lock'
      | 'neural_sparkle'
      | 'celebration_chords'
      | 'tactile_tap'
  ) {
    if (!this.soundEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    switch (type) {
      // Gentle ocean / air inhalation whoosh
      case 'inhale_whoosh': {
        const bufferSize = ctx.sampleRate * 2;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(200, now);
        filter.frequency.exponentialRampToValueAtTime(750, now + 1.8);
        filter.Q.setValueAtTime(3.0, now);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.exponentialRampToValueAtTime(0.18, now + 0.9);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 2.0);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        noise.start(now);
        noise.stop(now + 2.0);
        break;
      }

      // Warm relaxing exhalation breath sweep
      case 'exhale_whoosh': {
        const bufferSize = ctx.sampleRate * 2.5;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(650, now);
        filter.frequency.exponentialRampToValueAtTime(150, now + 2.3);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.16, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.4);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        noise.start(now);
        noise.stop(now + 2.5);
        break;
      }

      // Solfeggio 528Hz Meditation Singing Bowl Bell
      case 'singing_bowl': {
        const freqs = [528, 528 * 1.5, 528 * 2.0];
        const masterGain = ctx.createGain();
        masterGain.gain.setValueAtTime(0.0001, now);
        masterGain.gain.linearRampToValueAtTime(0.22, now + 0.008);
        masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.5);
        masterGain.connect(ctx.destination);

        freqs.forEach((f, idx) => {
          const osc = ctx.createOscillator();
          osc.type = idx === 0 ? 'sine' : 'triangle';
          osc.frequency.setValueAtTime(f, now);

          const g = ctx.createGain();
          g.gain.setValueAtTime(0.0001, now);
          g.gain.linearRampToValueAtTime(idx === 0 ? 0.8 : 0.2, now + 0.008);
          osc.connect(g);
          g.connect(masterGain);

          osc.start(now);
          osc.stop(now + 2.6);
        });
        break;
      }

      // Crisp Bio-Sonar Radar Acoustic Ping
      case 'sonar_ping': {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(1760, now + 0.08);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.46);
        break;
      }

      // Heavy Quantum Vault Hydraulic Lock Clank
      case 'vault_lock': {
        const osc1 = ctx.createOscillator();
        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(140, now);
        osc1.frequency.exponentialRampToValueAtTime(45, now + 0.35);

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(400, now);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);

        osc1.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(now);
        osc1.stop(now + 0.42);

        // Sub-boom impact
        const subOsc = ctx.createOscillator();
        subOsc.type = 'sine';
        subOsc.frequency.setValueAtTime(75, now + 0.05);
        subOsc.frequency.exponentialRampToValueAtTime(30, now + 0.5);

        const subGain = ctx.createGain();
        subGain.gain.setValueAtTime(0.35, now + 0.05);
        subGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);

        subOsc.connect(subGain);
        subGain.connect(ctx.destination);

        subOsc.start(now + 0.05);
        subOsc.stop(now + 0.6);
        break;
      }

      // Synaptic Stardust / Neural Sparkle
      case 'neural_sparkle': {
        const notes = [659, 784, 987, 1318];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.06);

          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.12, now + idx * 0.06);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.06 + 0.4);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now + idx * 0.06);
          osc.stop(now + idx * 0.06 + 0.45);
        });
        break;
      }

      // Harmonious Major Chord Celebration Cascade
      case 'celebration_chords': {
        const chord = [523.25, 659.25, 783.99, 1046.5]; // C Major
        chord.forEach((f, idx) => {
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, now + idx * 0.08);

          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.18, now + idx * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 1.6);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now + idx * 0.08);
          osc.stop(now + idx * 0.08 + 1.7);
        });
        break;
      }

      // Tactile button / card tap click
      case 'tactile_tap': {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.04);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.06);
        break;
      }
    }
  }

  // Chime / acoustic tone helper
  public playChime(freq: number = 528) {
    if (!this.soundEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 1.25);
  }

  // Binaural frequency generator helper
  public playBinauralTone(baseFreq: number = 432, beatFreq: number = 6) {
    if (!this.soundEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq + beatFreq, now);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.5);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 1.55);
  }

  // Celebration / completion sound helper
  public playSuccess() {
    this.playSfx('celebration_chords');
  }
}

export const audioEngine = new TherapeuticAudioEngine();
