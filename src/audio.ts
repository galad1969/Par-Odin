export class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted: boolean;
  private unlocked = false;
  private lastHitMs = 0;

  constructor(initialMuted = false) {
    this.muted = initialMuted;
    if (typeof window !== 'undefined') {
      const unlock = () => {
        this.unlocked = true;
        if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume();
      };
      window.addEventListener('pointerdown', unlock, { once: true, passive: true });
      window.addEventListener('keydown', unlock, { once: true, passive: true });
      if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', () => {
          if (!this.ctx) return;
          if (document.hidden && this.ctx.state === 'running') {
            void this.ctx.suspend();
          } else if (!document.hidden && !this.muted && this.unlocked && this.ctx.state === 'suspended') {
            void this.ctx.resume();
          }
        });
      }
    }
  }

  isMuted(): boolean {
    return this.muted;
  }

  setMuted(value: boolean) {
    this.muted = value;
  }

  private ensureContext(): AudioContext | null {
    if (this.muted || !this.unlocked) return null;
    if (!this.ctx && typeof AudioContext !== 'undefined') {
      this.ctx = new AudioContext();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  playDiceHit(velocity: number) {
    const nowMs = performance.now();
    if (nowMs - this.lastHitMs < 35) return;
    this.lastHitMs = nowMs;

    const ctx = this.ensureContext();
    if (!ctx) return;

    const intensity = Math.min(1, Math.max(0.08, velocity / 12));
    const t = ctx.currentTime;

    // Short filtered noise burst + woody resonance
    const bufferSize = Math.floor(ctx.sampleRate * 0.045);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.22));
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 650 + Math.random() * 520;
    filter.Q.value = 2.4;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.28 * intensity, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.045);

    noise.connect(filter).connect(gain).connect(ctx.destination);
    noise.start(t);

    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(210 + Math.random() * 90, t);
    osc.frequency.exponentialRampToValueAtTime(95, t + 0.05);
    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0.16 * intensity, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.055);
    osc.connect(oscGain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.06);
  }

  playMove() {
    this.playDiceHit(5.2);
  }

  playHint() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    for (const [i, freq] of [523.25, 659.25].entries()) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.001, t + i * 0.08);
      gain.gain.linearRampToValueAtTime(0.12, t + i * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.35);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t + i * 0.08);
      osc.stop(t + i * 0.08 + 0.36);
    }
  }

  playError() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(165, t);
    osc.frequency.linearRampToValueAtTime(118, t + 0.22);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    gain.gain.setValueAtTime(0.14, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    osc.connect(filter).connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.26);
  }

  playVictory() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    // Warm Norse D-major / fifth arpeggio
    const notes = [293.66, 440.0, 587.33, 739.99];
    notes.forEach((freq, idx) => {
      const start = t + idx * 0.095;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.14, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.65);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.68);
    });
  }
}
