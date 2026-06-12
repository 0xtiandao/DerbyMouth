// src/core/InspirationSystem.ts — mana: max 10, regen +1/2s, trừ theo cost, chặn khi thiếu.
// Pure TS, không Phaser. Nhận `now` (ms) từ ngoài như CombatEngine. Mỗi combatant 1 instance.
import type { CombatantState } from '../types';
import { BALANCE } from './constants';

export class InspirationSystem {
  private nextRegenAt: number;
  private slowPct = 0; // F1 Yap Storm: regen chậm % trong thời gian
  private slowUntil = 0;

  constructor(
    private readonly state: CombatantState,
    now: number,
  ) {
    this.nextRegenAt = now + this.intervalMs(now);
  }

  /** F1 Yap Storm: regen chậm pct% trong durationMs (lấy lần áp mới nhất, không cộng dồn). */
  applySlowRegen(pct: number, durationMs: number, now: number) {
    this.slowPct = pct;
    this.slowUntil = now + durationMs;
  }

  /** Regen chậm 30% = tốc độ ×0.7 → interval dài ra tương ứng. */
  private intervalMs(now: number): number {
    if (now < this.slowUntil && this.slowPct > 0 && this.slowPct < 100) {
      return BALANCE.INSPIRATION_REGEN_MS / (1 - this.slowPct / 100);
    }
    return BALANCE.INSPIRATION_REGEN_MS;
  }

  get value(): number {
    return this.state.inspiration;
  }

  /** Gọi mỗi frame. Trả về số điểm vừa regen (bù được nhiều mốc nếu frame trễ).
   *  Khi đầy: vòng regen đứng yên, mốc dời theo now → tụt xuống là đếm lại từ đầu. */
  tick(now: number): number {
    if (this.state.inspiration >= BALANCE.INSPIRATION_MAX) {
      this.nextRegenAt = now + this.intervalMs(now);
      return 0;
    }
    let gained = 0;
    while (now >= this.nextRegenAt) {
      this.state.inspiration++;
      gained++;
      this.nextRegenAt += this.intervalMs(now);
      if (this.state.inspiration >= BALANCE.INSPIRATION_MAX) break;
    }
    return gained;
  }

  canAfford(cost: number): boolean {
    return cost <= this.state.inspiration;
  }

  /** Trừ cost khi chơi card. Thiếu → false và KHÔNG trừ gì (chặn chơi card). */
  spend(cost: number): boolean {
    if (!this.canAfford(cost)) return false;
    this.state.inspiration -= cost;
    return true;
  }

  /** Hồi n điểm (F3/F5, trash talk option recover). Trả về số thực nhận (cap max). */
  recover(n: number): number {
    const gained = Math.min(n, BALANCE.INSPIRATION_MAX - this.state.inspiration);
    this.state.inspiration += gained;
    return gained;
  }

  /** Bị rút n điểm (R4 Name One Player). Trả về số thực mất (floor 0). */
  drain(n: number): number {
    const lost = Math.min(n, this.state.inspiration);
    this.state.inspiration -= lost;
    return lost;
  }

  /** 0..1 cho vòng regen quay quanh bubble (task 1.5). Đầy → 0 (vòng đứng yên). */
  regenProgress(now: number): number {
    if (this.state.inspiration >= BALANCE.INSPIRATION_MAX) return 0;
    const remaining = this.nextRegenAt - now;
    return Math.min(1, Math.max(0, 1 - remaining / this.intervalMs(now)));
  }
}
