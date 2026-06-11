// src/core/CombatEngine.ts — logic combat thuần TS, KHÔNG import Phaser.
// Mọi hàm nhận `now` (ms) từ ngoài thay vì tự đọc đồng hồ → test được không cần browser.
// Số liệu cân bằng đọc từ core/constants.ts + data/cards.ts, không hardcode ở đây.
import type {
  CardDef,
  CombatantState,
  ContentType,
  DamageBreakdown,
  Style,
  Team,
} from '../types';
import { BALANCE, CONTENT_COUNTERS, STYLE_COUNTERS } from './constants';

/** Tạo state khởi đầu cho 1 bên. styleSwitchReadyAt = now + cooldown (switch đầu tiên phải chờ 15s). */
export function createCombatant(style: Style, team: Team, now = 0): CombatantState {
  return {
    mf: BALANCE.MF_MAX,
    mfMax: BALANCE.MF_MAX,
    // Khởi đầu đầy Inspiration — InspirationSystem (task 1.4) quản lý regen/trừ cost.
    inspiration: BALANCE.INSPIRATION_MAX,
    style,
    styleSwitchReadyAt: now + BALANCE.STYLE_SWITCH_COOLDOWN_MS,
    lastCardContent: null,
    comboCount: 1,
    lastPlayedAt: -Infinity,
    shields: 0,
    marks: [],
    silencedUntil: 0,
    team,
  };
}

/** Style RPS: attacker khắc defender? (Rebuttal > Filibuster > Bluster > Provocation > Rebuttal) */
export function hasStyleAdvantage(attacker: Style, defender: Style): boolean {
  return STYLE_COUNTERS[attacker] === defender;
}

/** COUNTERED: defender vừa đánh card loại bị attackContent khắc, trong window 5s. */
export function isContentCounter(
  attackContent: ContentType,
  defender: CombatantState,
  now: number,
): boolean {
  return (
    defender.lastCardContent !== null &&
    CONTENT_COUNTERS[attackContent] === defender.lastCardContent &&
    now - defender.lastPlayedAt <= BALANCE.COUNTER_WINDOW_MS
  );
}

/** Combo level mà ĐÒN NÀY đạt (1/2/3). Quyết định thiết kế: sau finale x3 chuỗi
 *  reset — card thứ 4 cùng loại bắt đầu chuỗi MỚI (level 1), không x2 mãi. */
export function nextComboLevel(attacker: CombatantState, content: ContentType): number {
  if (attacker.lastCardContent !== content) return 1;
  if (attacker.comboCount >= 3) return 1;
  return attacker.comboCount + 1;
}

function comboMultiplier(level: number): number {
  if (level === 3) return BALANCE.COMBO_X3_MULT;
  if (level === 2) return BALANCE.COMBO_X2_MULT;
  return 1;
}

/** Mark đang hiệu lực → 1 + value/100 (lấy mark mạnh nhất). value đến từ card data (P2: 10 → 1.1). */
export function activeMarkBonus(defender: CombatantState, now: number): number {
  let best = 0;
  for (const m of defender.marks) {
    if (m.expiresAt > now && m.value > best) best = m.value;
  }
  return 1 + best / 100;
}

/** Dọn mark hết hạn (gọi định kỳ từ scene tick). */
export function pruneExpiredMarks(state: CombatantState, now: number): void {
  state.marks = state.marks.filter((m) => m.expiresAt > now);
}

/** Tính damage THUẦN, không mutate state nào.
 *  finalDmg = base × styleBuff × contentCounter × comboMult × markBonus
 *  Invariant: final = round(tích 5 cột trong breakdown) — effect formula-level
 *  (counterBonus, comboFinisherX2) được gộp vào base/comboMult để giữ invariant. */
export function computeDamage(
  card: CardDef,
  attacker: CombatantState,
  defender: CombatantState,
  now: number,
): DamageBreakdown {
  const styleBuff = hasStyleAdvantage(attacker.style, defender.style) ? BALANCE.STYLE_BUFF : 1;
  const countered = isContentCounter(card.content, defender, now);
  const contentCounter = countered ? BALANCE.CONTENT_COUNTER_MULT : 1;
  const comboLevel = nextComboLevel(attacker, card.content);
  let comboMult = comboMultiplier(comboLevel);

  let base = card.baseDmg;
  for (const fx of card.effects) {
    // counterBonus (R1): cộng vào base TRƯỚC khi nhân — thưởng counter play đậm hơn
    if (fx.kind === 'counterBonus' && countered) base += fx.value ?? 0;
    // comboFinisherX2 (B3): x2 thêm nếu là card CHỐT combo x3
    if (fx.kind === 'comboFinisherX2' && comboLevel === 3) comboMult *= 2;
  }

  const markBonus = activeMarkBonus(defender, now);
  const final = Math.round(base * styleBuff * contentCounter * comboMult * markBonus);

  return { base, styleBuff, contentCounter, comboMult, markBonus, final, countered, comboLevel };
}

/** Ghi nhận attacker vừa đánh card (mutate combo state + counter window cho đối thủ). */
export function registerCardPlayed(
  attacker: CombatantState,
  card: CardDef,
  comboLevel: number,
  now: number,
): void {
  attacker.lastCardContent = card.content;
  attacker.comboCount = comboLevel;
  attacker.lastPlayedAt = now;
}

/** Đứt combo: đổi loại card (tự xảy ra qua nextComboLevel) hoặc bị silence (gọi hàm này). */
export function breakCombo(state: CombatantState): void {
  state.comboCount = 1;
  state.lastCardContent = null;
}

/** Silence: câm + đứt combo (docs/PLAN.md mục 2.6). */
export function applySilence(state: CombatantState, durationMs: number, now: number): void {
  state.silencedUntil = Math.max(state.silencedUntil, now + durationMs);
  breakCombo(state);
}

export function isSilenced(state: CombatantState, now: number): boolean {
  return now < state.silencedUntil;
}

/** Hồi MF (Crowd Lifesteal / Liquid Courage / quiz). Trả về số máu hồi thật (cap mfMax). */
export function applyHeal(state: CombatantState, amount: number): number {
  const healed = Math.min(amount, state.mfMax - state.mf);
  state.mf += healed;
  return healed;
}

/** Trừ MF qua shield. Shield (F2) chặn tối đa `shields` dmg của ĐÚNG 1 đòn kế tiếp —
 *  dùng xong là mất hết kể cả chặn chưa đủ giá trị. Đòn 0 dmg không tốn shield. */
export function applyDamage(
  defender: CombatantState,
  amount: number,
): { absorbed: number; mfLoss: number } {
  if (amount <= 0) return { absorbed: 0, mfLoss: 0 };
  const absorbed = Math.min(defender.shields, amount);
  defender.shields = 0;
  const mfLoss = Math.min(defender.mf, amount - absorbed);
  defender.mf -= mfLoss;
  return { absorbed, mfLoss };
}

/** Một lượt đánh card trọn vẹn: tính dmg → ghi nhận combo → trừ MF defender
 *  → Crowd Lifesteal cho attacker (COUNTERED hút 30% final, combo x3 hồi flat).
 *  KHÔNG xử lý Inspiration cost (task 1.4) và các effect ngoài formula (task 1.6/Phase 3). */
export function resolveCardPlay(
  card: CardDef,
  attacker: CombatantState,
  defender: CombatantState,
  now: number,
): DamageBreakdown & { mfLoss: number; healed: number } {
  const breakdown = computeDamage(card, attacker, defender, now);
  registerCardPlayed(attacker, card, breakdown.comboLevel, now);
  const { mfLoss } = applyDamage(defender, breakdown.final);

  // Crowd Lifesteal: heal theo final (trước shield) — thưởng cú đánh hay, không phạt vì shield
  let heal = 0;
  if (breakdown.countered) heal += Math.round((breakdown.final * BALANCE.LIFESTEAL_COUNTER_PCT) / 100);
  if (breakdown.comboLevel === 3) heal += BALANCE.COMBO3_HEAL;
  const healed = heal > 0 ? applyHeal(attacker, heal) : 0;

  return { ...breakdown, mfLoss, healed };
}
