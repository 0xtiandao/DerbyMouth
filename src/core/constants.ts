// src/core/constants.ts — MỌI con số cân bằng. Tune ở đây, không sửa logic.
import type { ContentType, Style } from '../types';

export const BALANCE = {
  MF_MAX: 1000,
  INSPIRATION_MAX: 10,
  INSPIRATION_REGEN_MS: 2000,   // +1 mỗi 2s
  HAND_SIZE: 4,

  STYLE_SWITCH_COOLDOWN_MS: 15000,
  STYLE_BUFF: 1.25,             // khắc đúng style đối thủ

  COUNTER_WINDOW_MS: 5000,      // window đánh card khắc loại
  CONTENT_COUNTER_MULT: 1.5,

  COMBO_X2_MULT: 1.25,
  COMBO_X3_MULT: 2.0,           // nếu vỡ trận → thử 1.75 trước

  MARK_BONUS: 1.1,

  MATCH_TIMER_MS: 180000,       // 3 phút → sudden death
  SUDDEN_DEATH_DRAIN_PER_SEC: 25,

  // Trash Talk QTE
  PROMPT_BASE_CHANCE: 0.12,     // mỗi 5s NPC nói
  PROMPT_CHECK_INTERVAL_MS: 5000,
  PROMPT_ANGER_BONUS: 0.1,      // P3 Crying Jordan: NPC tilted → dễ trigger hơn
  ANGER_DURATION_MS: 12000,
  QTE_WINDOW_MS: 1200,          // thời gian nhấn Q/E
  TT_HEAVY_DMG_PCT: 150,        // % của 1 đòn chuẩn (xem ghi chú dưới)
  TT_MEDIUM_DMG_PCT: 40,
  TT_STANDARD_HIT: 100,         // "đòn chuẩn" = 100 dmg để tính % trash talk
  TT_SILENCE_MS: 1800,
  TT_RECOVER_INSPIRATION: 3,    // option recover hồi bao nhiêu Inspiration
  TT_MENU_TIMEOUT_MS: 5000,     // menu 3 option tự đóng nếu không chọn
  QUIZ_WRONG_BONUS_DMG: 80,
  QUIZ_ANSWER_TIME_MS: 6000,    // PVP: thời gian đối thủ trả lời quiz
  // Quiz PVE (task 2.2)
  TT_QUIZ_OPTION_CHANCE: 0.35,  // xác suất option heavy trong menu bị thay bằng quiz
  QUIZ_NPC_CORRECT_EASY: 0.65,  // % NPC trả lời đúng theo độ khó
  QUIZ_NPC_CORRECT_MEDIUM: 0.45,
  QUIZ_NPC_CORRECT_HARD: 0.25,
  QUIZ_CORRECT_REFLECT_DMG: 60, // NPC đúng → phản damage lại người hỏi
  QUIZ_THINK_MS: 1600,          // NPC "suy nghĩ" trước khi trả lời
  QUIZ_BADGE_DURATION_MS: 8000, // badge "fan nửa mùa" + mark tồn tại bao lâu
  QUIZ_BADGE_MARK_VALUE: 10,    // badge kèm mark +10% dmg nhận vào (dùng cơ chế mark có sẵn)

  // NPC
  NPC_PLAY_INTERVAL_MIN_MS: 3000,
  NPC_PLAY_INTERVAL_MAX_MS: 5000,
  NPC_STYLE_SWITCH_MIN_MS: 20000,
  NPC_STYLE_SWITCH_MAX_MS: 30000,
  NPC_POOR_RETRY_MS: 1000,      // nghèo Inspiration → thử chơi lại sau

} as const;

/** Style RPS: key khắc value. Rebuttal > Filibuster > Bluster > Provocation > Rebuttal */
export const STYLE_COUNTERS: Record<Style, Style> = {
  rebuttal: 'filibuster',
  filibuster: 'bluster',
  bluster: 'provocation',
  provocation: 'rebuttal',
};

/** Content counter vòng: key khắc value.
 *  Rational > Intimidation > Emotional > Fan-Shaming > Rational */
export const CONTENT_COUNTERS: Record<ContentType, ContentType> = {
  rational: 'intimidation',
  intimidation: 'emotional',
  emotional: 'fanshaming',
  fanshaming: 'rational',
};

export const CONTENT_COLORS: Record<ContentType, number> = {
  rational: 0x3b82f6,     // blue
  emotional: 0xec4899,    // pink
  intimidation: 0xef4444, // red
  fanshaming: 0x22c55e,   // green
};

export const CONTENT_LABELS: Record<ContentType, string> = {
  rational: 'Rational',
  emotional: 'Emotional',
  intimidation: 'Intimidation',
  fanshaming: 'Fan-Shaming',
};

export const STYLE_LABELS: Record<Style, string> = {
  rebuttal: 'Rebuttal',
  filibuster: 'Filibuster',
  bluster: 'Bluster',
  provocation: 'Provocation',
};

/** Màu style (khác bảng CONTENT_COLORS để không nhầm 2 lớp style/content) */
export const STYLE_COLORS: Record<Style, number> = {
  rebuttal: 0x60a5fa,    // light blue
  filibuster: 0xa78bfa,  // violet
  bluster: 0xf59e0b,     // amber
  provocation: 0x34d399, // emerald
};

/** Tagline ngắn hiện ở màn chọn style */
export const STYLE_TAGLINES: Record<Style, string> = {
  rebuttal: 'Reactive — read & counter',
  filibuster: 'Stall — drain their resources',
  bluster: 'Burst — big flex damage',
  provocation: 'Bait — create openings',
};
