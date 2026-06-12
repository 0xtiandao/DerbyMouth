// src/core/NpcBrain.ts — NPC brain v2 (Phase 3): biết đọc bài.
// - Ưu tiên chọn card KHẮC content type đối thủ vừa đánh (NPC_COUNTER_PICK_CHANCE)
// - Switch sang style khắc style đối thủ (NPC_SMART_SWITCH_CHANCE); đang khắc thì GIỮ
// - Giữ "ý định" card kế tiếp → R2 Fact Check lộ được bài (revealNext)
// Pure TS, không Phaser. RNG inject được để test deterministic.
import type { CardDef, CombatantState, Style } from '../types';
import { BALANCE, CONTENT_COUNTERS, STYLE_COUNTERS } from './constants';
import { effectiveCost, isSilenced } from './CombatEngine';
import { cardsByStyle } from '../data/cards';

const ALL_STYLES = Object.keys(STYLE_COUNTERS) as Style[];

export type NpcAction =
  | { kind: 'play'; card: CardDef }
  | { kind: 'switch'; style: Style };

export class NpcBrain {
  private nextPlayAt: number;
  private nextSwitchAt: number;
  private intent: CardDef | null = null;

  constructor(
    private readonly state: CombatantState,
    private readonly enemy: CombatantState, // đọc bài đối thủ (PVE: player)
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
    this.intent = this.chooseCard(now);
  }

  /** Card NPC ĐỊNH đánh kế tiếp — R2 Fact Check (revealNext) đọc cái này. */
  get nextIntent(): CardDef | null {
    return this.intent;
  }

  /** Gọi mỗi frame. Trả về 0..2 hành động (switch và/hoặc play). */
  tick(now: number): NpcAction[] {
    const actions: NpcAction[] = [];

    // Switch style mỗi 20-30s. Silence không cấm switch (câm ≠ không đổi thế).
    if (now >= this.nextSwitchAt) {
      const style = this.chooseStyle();
      if (style) actions.push({ kind: 'switch', style });
      this.nextSwitchAt = now + this.between(
        BALANCE.NPC_STYLE_SWITCH_MIN_MS,
        BALANCE.NPC_STYLE_SWITCH_MAX_MS,
      );
    }

    // Đang bị câm → không nói. KHÔNG dời nextPlayAt: hết câm là nói liền nếu đã quá hạn.
    if (isSilenced(this.state, now)) return actions;

    if (now >= this.nextPlayAt) {
      // ý định cũ hết afford (bị drain/costUp) → chọn lại
      if (!this.intent || effectiveCost(this.intent, this.state, now) > this.state.inspiration) {
        this.intent = this.chooseCard(now);
      }
      if (this.intent) {
        actions.push({ kind: 'play', card: this.intent });
        this.intent = this.chooseCard(now); // chọn trước ý định KẾ TIẾP (cho reveal)
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

  /** v2: ưu tiên card khắc content đối thủ vừa đánh, không thì random affordable. */
  private chooseCard(now: number): CardDef | null {
    const affordable = cardsByStyle(this.state.style).filter(
      (c) => effectiveCost(c, this.state, now) <= this.state.inspiration,
    );
    if (affordable.length === 0) return null;

    const targetContent = this.enemy.lastCardContent;
    if (targetContent && this.rng() < BALANCE.NPC_COUNTER_PICK_CHANCE) {
      const counters = affordable.filter((c) => CONTENT_COUNTERS[c.content] === targetContent);
      if (counters.length > 0) return counters[Math.floor(this.rng() * counters.length)];
    }
    return affordable[Math.floor(this.rng() * affordable.length)];
  }

  /** v2: đang khắc đối thủ → GIỮ style (trả null); không thì ưu tiên style khắc nó. */
  private chooseStyle(): Style | null {
    if (STYLE_COUNTERS[this.state.style] === this.enemy.style) return null;

    if (this.rng() < BALANCE.NPC_SMART_SWITCH_CHANCE) {
      const counterStyle = ALL_STYLES.find((s) => STYLE_COUNTERS[s] === this.enemy.style);
      if (counterStyle && counterStyle !== this.state.style) return counterStyle;
    }
    const others = ALL_STYLES.filter((s) => s !== this.state.style);
    return others[Math.floor(this.rng() * others.length)];
  }

  private between(min: number, max: number): number {
    return min + this.rng() * (max - min);
  }
}
