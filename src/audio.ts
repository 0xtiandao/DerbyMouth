// src/audio.ts — SFX tổng hợp bằng Web Audio API (procedural, không cần file asset).
// Phase 5: âm thanh "retro pub" sinh ngay trong code. Sau này thay bằng sound thật
// (Freesound/Pixabay CC0) chỉ cần đổi phần play() — API gọi giữ nguyên.
// KHÔNG phụ thuộc Phaser. Scene gọi sfx.play('cardPlay')...

export type Sfx =
  | 'click'
  | 'cardPlay'
  | 'hit'
  | 'counter'
  | 'combo2'
  | 'combo3'
  | 'heal'
  | 'beerStart'
  | 'beerDone'
  | 'choke'
  | 'silence'
  | 'qtePrompt'
  | 'quizWrong'
  | 'quizRight'
  | 'switchStyle'
  | 'win'
  | 'lose'
  | 'knockout';

const MUTE_KEY = 'derbymouth.muted.v1';

class SoundManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private muted = false;

  constructor() {
    try {
      this.muted = localStorage.getItem(MUTE_KEY) === '1';
    } catch {
      /* ignore */
    }
  }

  /** Tạo/resume AudioContext — phải gọi trong 1 user gesture (autoplay policy). */
  private ensure(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.35; // headroom, tránh chói
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  /** Gọi 1 lần khi có input đầu tiên (mở khoá audio). */
  unlock(): void {
    this.ensure();
  }

  get isMuted(): boolean {
    return this.muted;
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    try {
      localStorage.setItem(MUTE_KEY, this.muted ? '1' : '0');
    } catch {
      /* ignore */
    }
    return this.muted;
  }

  play(sfx: Sfx): void {
    if (this.muted) return;
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const t = ctx.currentTime;
    switch (sfx) {
      case 'click':
        this.blip(t, 620, 0.05, 'square', 0.5);
        break;
      case 'cardPlay':
        this.thud(t, 0.13);
        this.tone(t, 140, 80, 0.12, 'sine', 0.5);
        break;
      case 'hit':
        this.thud(t, 0.1);
        this.tone(t, 220, 110, 0.1, 'triangle', 0.4);
        break;
      case 'counter': // zap chói sáng
        this.sweep(t, 700, 1700, 0.16, 'sawtooth', 0.4);
        this.noise(t, 0.08, 2200, 0.3);
        break;
      case 'combo2':
        this.arp(t, [523, 784], 0.09, 'triangle');
        break;
      case 'combo3': // finisher hào hùng
        this.arp(t, [523, 659, 988], 0.1, 'sawtooth');
        break;
      case 'heal': // chime mềm đi lên
        this.tone(t, 660, 990, 0.35, 'sine', 0.35);
        this.tone(t + 0.08, 880, 1320, 0.3, 'sine', 0.25);
        break;
      case 'beerStart': // glug glug — vài blip trầm bong bóng
        for (let i = 0; i < 4; i++) this.blip(t + i * 0.18, 180 - i * 12, 0.1, 'sine', 0.35);
        break;
      case 'beerDone': // "ahh" hợp âm nhẹ
        this.tone(t, 330, 330, 0.4, 'sine', 0.3);
        this.tone(t, 440, 440, 0.4, 'sine', 0.2);
        break;
      case 'choke': // sặc — buzz hạ xuống
        this.sweep(t, 400, 90, 0.3, 'square', 0.4);
        this.noise(t, 0.2, 800, 0.4);
        break;
      case 'silence': // im — thud bị bóp
        this.tone(t, 300, 120, 0.18, 'sine', 0.4);
        break;
      case 'qtePrompt': // beep-beep cảnh báo
        this.blip(t, 1050, 0.07, 'square', 0.45);
        this.blip(t + 0.12, 1300, 0.07, 'square', 0.45);
        break;
      case 'quizWrong': // còi sai
        this.tone(t, 160, 150, 0.32, 'square', 0.5);
        break;
      case 'quizRight':
        this.tone(t, 880, 880, 0.12, 'sine', 0.4);
        this.tone(t + 0.1, 1320, 1320, 0.18, 'sine', 0.35);
        break;
      case 'switchStyle':
        this.sweep(t, 300, 900, 0.18, 'triangle', 0.3);
        break;
      case 'knockout':
        this.thud(t, 0.25);
        this.sweep(t, 200, 60, 0.3, 'sawtooth', 0.5);
        break;
      case 'win': // fanfare đi lên
        this.arp(t, [523, 659, 784, 1047], 0.12, 'sawtooth');
        break;
      case 'lose': // tụt buồn
        this.arp(t, [440, 392, 311], 0.16, 'triangle');
        break;
    }
  }

  // ---- synth helpers ----
  private env(t: number, dur: number, peak: number): GainNode {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    g.connect(this.master!);
    return g;
  }

  private tone(t: number, f0: number, f1: number, dur: number, type: OscillatorType, peak: number): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    osc.connect(this.env(t, dur, peak));
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  private blip(t: number, f: number, dur: number, type: OscillatorType, peak: number): void {
    this.tone(t, f, f, dur, type, peak);
  }

  private sweep(t: number, f0: number, f1: number, dur: number, type: OscillatorType, peak: number): void {
    this.tone(t, f0, f1, dur, type, peak);
  }

  private arp(t: number, freqs: number[], step: number, type: OscillatorType): void {
    freqs.forEach((f, i) => this.tone(t + i * step, f, f, step * 1.6, type, 0.35));
  }

  private thud(t: number, dur: number): void {
    this.noise(t, dur, 380, 0.5); // noise lowpass = đập bàn
  }

  private noise(t: number, dur: number, filterFreq: number, peak: number): void {
    const ctx = this.ctx!;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = filterFreq;
    src.connect(lp);
    lp.connect(this.env(t, dur, peak));
    src.start(t);
    src.stop(t + dur + 0.02);
  }
}

export const sfx = new SoundManager();
