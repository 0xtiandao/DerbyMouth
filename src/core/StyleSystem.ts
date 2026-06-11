// src/core/StyleSystem.ts — style hiện tại 2 bên + switch cooldown 15s + event khi switch.
// Pure TS, không Phaser — event qua listener array thường, không EventEmitter.
import type { CombatantState, Side, Style } from '../types';
import { BALANCE } from './constants';
import { hasStyleAdvantage } from './CombatEngine';

export interface StyleSwitchEvent {
  side: Side;
  from: Style;
  to: Style;
  at: number;
}

export type StyleSwitchListener = (e: StyleSwitchEvent) => void;

export class StyleSystem {
  private listeners: StyleSwitchListener[] = [];

  constructor(private readonly sides: Record<Side, CombatantState>) {}

  styleOf(side: Side): Style {
    return this.sides[side].style;
  }

  canSwitch(side: Side, now: number): boolean {
    return now >= this.sides[side].styleSwitchReadyAt;
  }

  /** ms còn lại tới khi được switch (0 = sẵn sàng) — cho vòng đếm ngược trên nút. */
  cooldownRemaining(side: Side, now: number): number {
    return Math.max(0, this.sides[side].styleSwitchReadyAt - now);
  }

  /** 0..1, 1 = nút switch sáng. */
  cooldownProgress(side: Side, now: number): number {
    const remaining = this.cooldownRemaining(side, now);
    return Math.min(1, Math.max(0, 1 - remaining / BALANCE.STYLE_SWITCH_COOLDOWN_MS));
  }

  /** Đổi style. false nếu đang cooldown HOẶC trùng style hiện tại (không tốn cooldown oan).
   *  Phase 3: P4 Bait & Switch (switchCooldownDown) trừ vào cooldown đặt Ở ĐÂY. */
  switchTo(side: Side, newStyle: Style, now: number): boolean {
    const st = this.sides[side];
    if (!this.canSwitch(side, now) || newStyle === st.style) return false;

    const from = st.style;
    st.style = newStyle;
    st.styleSwitchReadyAt = now + BALANCE.STYLE_SWITCH_COOLDOWN_MS;

    const event: StyleSwitchEvent = { side, from, to: newStyle, at: now };
    for (const listener of [...this.listeners]) listener(event);
    return true;
  }

  /** Bên đang giữ lợi thế style (hiện buff +25% trên UI), null nếu không ai khắc ai. */
  advantage(): Side | null {
    if (hasStyleAdvantage(this.sides.player.style, this.sides.opponent.style)) return 'player';
    if (hasStyleAdvantage(this.sides.opponent.style, this.sides.player.style)) return 'opponent';
    return null;
  }

  /** Đăng ký nghe switch (UI đổi indicator, NpcBrain đọc để phản ứng). Trả về hàm unsubscribe. */
  onSwitch(listener: StyleSwitchListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }
}
