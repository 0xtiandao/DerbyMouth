// src/core/TrashTalkQTE.ts — Trash Talk QTE (task 2.1): trigger random khi NPC nói,
// nhấn Q/E trong window 1.2s → mở menu 3 option, miss/sai phím → mất cơ hội.
// Pure TS, không Phaser. RNG inject được để test deterministic.
import type { CombatantState } from '../types';
import { BALANCE } from './constants';
import { isSilenced } from './CombatEngine';

export type QteKey = 'Q' | 'E';
export type QtePhase = 'idle' | 'prompt' | 'menu';

export type QteEvent =
  | { kind: 'promptShown'; key: QteKey }
  | { kind: 'promptMissed' }
  | { kind: 'menuTimeout' };

export class TrashTalkQTE {
  private phase: QtePhase = 'idle';
  private nextCheckAt: number;
  private promptDeadline = 0;
  private menuDeadline = 0;
  private promptKey: QteKey = 'Q';
  // Scholar buffs
  private bonusChancePct = 0; // P1 Touch Grass (+15 = +15%)
  private bonusUntil = 0;
  private angerUntil = 0; // P3 Crying Jordan

  constructor(
    private readonly npc: CombatantState,
    now: number,
    private readonly rng: () => number = Math.random,
  ) {
    this.nextCheckAt = now + BALANCE.PROMPT_CHECK_INTERVAL_MS;
  }

  get currentPhase(): QtePhase {
    return this.phase;
  }

  get key(): QteKey {
    return this.promptKey;
  }

  /** % trigger hiện tại = base + Scholar buff (P1) + anger (P3). */
  chance(now: number): number {
    let c: number = BALANCE.PROMPT_BASE_CHANCE;
    if (now < this.bonusUntil) c += this.bonusChancePct / 100;
    if (now < this.angerUntil) c += BALANCE.PROMPT_ANGER_BONUS;
    return c;
  }

  /** P1 Touch Grass: +value% chance trong durationMs (không cộng dồn — lấy lần mới nhất). */
  applyPromptChanceUp(valuePct: number, durationMs: number, now: number) {
    this.bonusChancePct = valuePct;
    this.bonusUntil = now + durationMs;
  }

  /** P3 Crying Jordan: NPC tilted → +PROMPT_ANGER_BONUS chance trong ANGER_DURATION_MS. */
  applyAnger(now: number) {
    this.angerUntil = now + BALANCE.ANGER_DURATION_MS;
  }

  /** Gọi mỗi frame. Trả event khi có chuyển trạng thái cần render. */
  tick(now: number): QteEvent | null {
    if (this.phase === 'idle') {
      if (now < this.nextCheckAt) return null;
      this.nextCheckAt = now + BALANCE.PROMPT_CHECK_INTERVAL_MS;
      // chỉ trigger khi NPC "đang nói": có đánh card trong interval vừa rồi + không bị câm
      const npcTalking =
        !isSilenced(this.npc, now) &&
        now - this.npc.lastPlayedAt <= BALANCE.PROMPT_CHECK_INTERVAL_MS;
      if (npcTalking && this.rng() < this.chance(now)) {
        this.phase = 'prompt';
        this.promptKey = this.rng() < 0.5 ? 'Q' : 'E';
        this.promptDeadline = now + BALANCE.QTE_WINDOW_MS;
        return { kind: 'promptShown', key: this.promptKey };
      }
      return null;
    }
    if (this.phase === 'prompt' && now >= this.promptDeadline) {
      this.phase = 'idle';
      return { kind: 'promptMissed' };
    }
    if (this.phase === 'menu' && now >= this.menuDeadline) {
      this.phase = 'idle';
      return { kind: 'menuTimeout' };
    }
    return null;
  }

  /** Player nhấn Q/E (hoặc tap nút trái/phải). Sai phím = mất cơ hội (commit theo read). */
  pressKey(key: QteKey, now: number): 'opened' | 'wrongKey' | 'ignored' {
    if (this.phase !== 'prompt' || now > this.promptDeadline) return 'ignored';
    if (key !== this.promptKey) {
      this.phase = 'idle';
      return 'wrongKey';
    }
    this.phase = 'menu';
    this.menuDeadline = now + BALANCE.TT_MENU_TIMEOUT_MS;
    return 'opened';
  }

  /** Player chọn 1 option trong menu. true = hợp lệ (đang ở menu) — scene áp effect. */
  choose(now: number): boolean {
    if (this.phase !== 'menu' || now > this.menuDeadline) return false;
    this.phase = 'idle';
    return true;
  }

  /** 0..1 thời gian còn lại của prompt window (cho vòng đếm trên nút Q/E). */
  promptProgress(now: number): number {
    if (this.phase !== 'prompt') return 0;
    return Math.min(1, Math.max(0, (this.promptDeadline - now) / BALANCE.QTE_WINDOW_MS));
  }

  /** 0..1 thời gian còn lại của menu (thanh countdown). */
  menuProgress(now: number): number {
    if (this.phase !== 'menu') return 0;
    return Math.min(1, Math.max(0, (this.menuDeadline - now) / BALANCE.TT_MENU_TIMEOUT_MS));
  }
}
