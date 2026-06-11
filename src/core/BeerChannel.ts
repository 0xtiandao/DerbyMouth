// src/core/BeerChannel.ts — "Liquid Courage": uống bia hồi MF, channel 2s hở sườn.
// Trong lúc uống: không chơi card, không Q/E (scene chặn). Bị trúng đòn = sặc:
// mất heal + dính thêm % dmg đòn đó. Cooldown tính từ lúc BẮT ĐẦU uống — sặc vẫn mất lượt.
// Pure TS, không Phaser.
import type { CombatantState } from '../types';
import { BALANCE } from './constants';
import { applyHeal } from './CombatEngine';

export class BeerChannel {
  private channeling = false;
  private channelEndAt = 0;
  private readyAt = 0;

  constructor(private readonly state: CombatantState) {}

  canStart(now: number): boolean {
    return !this.channeling && now >= this.readyAt;
  }

  start(now: number): boolean {
    if (!this.canStart(now)) return false;
    this.channeling = true;
    this.channelEndAt = now + BALANCE.BEER_CHANNEL_MS;
    this.readyAt = now + BALANCE.BEER_COOLDOWN_MS;
    return true;
  }

  isChanneling(): boolean {
    return this.channeling;
  }

  /** Gọi mỗi frame. Channel hoàn tất → hồi máu, trả số máu hồi thật (0 nếu chưa/không uống). */
  tick(now: number): number {
    if (!this.channeling || now < this.channelEndAt) return 0;
    this.channeling = false;
    return applyHeal(this.state, BALANCE.BEER_HEAL);
  }

  /** Bị đánh giữa lúc uống → sặc, mất heal. Trả true nếu thật sự đang uống (caller phạt thêm dmg). */
  interrupt(): boolean {
    if (!this.channeling) return false;
    this.channeling = false;
    return true;
  }

  /** 0..1 tiến độ uống (cho thanh/vòng channel UI). */
  channelProgress(now: number): number {
    if (!this.channeling) return 0;
    const remaining = this.channelEndAt - now;
    return Math.min(1, Math.max(0, 1 - remaining / BALANCE.BEER_CHANNEL_MS));
  }

  /** 0..1, 1 = sẵn sàng uống (nút sáng). */
  cooldownProgress(now: number): number {
    const remaining = Math.max(0, this.readyAt - now);
    return Math.min(1, Math.max(0, 1 - remaining / BALANCE.BEER_COOLDOWN_MS));
  }
}
