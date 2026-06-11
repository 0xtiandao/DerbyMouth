// src/core/NpcBrain.ts — NPC brain v1 (task 1.7): đơn giản, random.
// Pure TS, không Phaser. RNG inject được để test deterministic.
// v2 (Phase 3): ưu tiên counter content type player vừa đánh, switch style có logic.
import type { CardDef, CombatantState, Style } from '../types';
import { BALANCE, STYLE_COUNTERS } from './constants';
import { isSilenced } from './CombatEngine';
import { cardsByStyle } from '../data/cards';

const ALL_STYLES = Object.keys(STYLE_COUNTERS) as Style[];

export type NpcAction =
  | { kind: 'play'; card: CardDef }
  | { kind: 'switch'; style: Style };

export class NpcBrain {
  private nextPlayAt: number;
  private nextSwitchAt: number;

  constructor(
    private readonly state: CombatantState,
    now: number,
    private readonly rng: () => number = Math.random,
  ) {
    this.nextPlayAt = now + this.between(
      BALANCE.NPC_PLAY_INTERVAL_MIN_MS,
      BALANCE.NPC_PLAY_INTERVAL_MAX_MS,
    );
    this.nextSwitchAt = now + this.between(
      BALANCE.NPC_STYLE_SWITCH_MIN_MS,
      BALANCE.NPC_STYLE_SWITCH_MAX_MS,
    );
  }

  /** Gọi mỗi frame. Trả về 0..2 hành động NPC muốn làm (switch và/hoặc play).
   *  Scene thực thi: switch qua StyleSystem (tự enforce cooldown), play qua resolveCardPlay. */
  tick(now: number): NpcAction[] {
    const actions: NpcAction[] = [];

    // Switch style ngẫu nhiên mỗi 20-30s. Silence không cấm switch (câm ≠ không đổi thế).
    if (now >= this.nextSwitchAt) {
      const others = ALL_STYLES.filter((s) => s !== this.state.style);
      actions.push({ kind: 'switch', style: others[Math.floor(this.rng() * others.length)] });
      this.nextSwitchAt = now + this.between(
        BALANCE.NPC_STYLE_SWITCH_MIN_MS,
        BALANCE.NPC_STYLE_SWITCH_MAX_MS,
      );
    }

    // Đang bị câm → không nói. KHÔNG dời nextPlayAt: hết câm là nói liền nếu đã quá hạn.
    if (isSilenced(this.state, now)) return actions;

    if (now >= this.nextPlayAt) {
      const affordable = cardsByStyle(this.state.style).filter(
        (c) => c.cost <= this.state.inspiration,
      );
      if (affordable.length > 0) {
        actions.push({ kind: 'play', card: affordable[Math.floor(this.rng() * affordable.length)] });
        this.nextPlayAt = now + this.between(
          BALANCE.NPC_PLAY_INTERVAL_MIN_MS,
          BALANCE.NPC_PLAY_INTERVAL_MAX_MS,
        );
      } else {
        this.nextPlayAt = now + BALANCE.NPC_POOR_RETRY_MS;
      }
    }

    return actions;
  }

  private between(min: number, max: number): number {
    return min + this.rng() * (max - min);
  }
}
