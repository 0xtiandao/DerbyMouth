// src/types.ts — TẤT CẢ types dùng chung của DerbyMouth
// Thêm type mới ở đây, không rải rác trong các file khác.

/** 4 style RPS: Rebuttal > Filibuster > Bluster > Provocation > Rebuttal */
export type Style = 'rebuttal' | 'filibuster' | 'bluster' | 'provocation';

/** 4 loại nội dung roast — counter vòng: rational > intimidation > emotional > fanshaming > rational */
export type ContentType = 'rational' | 'emotional' | 'intimidation' | 'fanshaming';

export type EffectKind =
  | 'damage'            // chỉ damage
  | 'silence'           // câm NPC x giây
  | 'recoverInspiration'
  | 'drainInspiration'  // trừ Inspiration đối thủ
  | 'slowRegen'         // regen đối thủ chậm %
  | 'shield'            // chặn dmg đòn kế
  | 'costUp'            // card đối thủ cost +1
  | 'buffNext'          // card kế của mình +% dmg
  | 'mark'              // đối thủ nhận thêm % dmg
  | 'promptChanceUp'    // Scholar: tăng % trash talk prompt
  | 'npcMoodAnger'      // Scholar: NPC dễ trigger prompt
  | 'switchCooldownDown'// giảm cooldown switch style
  | 'comboFinisherX2'   // x2 nếu là card chốt combo
  | 'counterBonus'      // +dmg nếu đòn này trigger COUNTERED
  | 'revealNext'        // lộ content type card kế đối thủ
  | 'forceQuiz';        // ép mini-quiz ngay

export interface CardEffect {
  kind: EffectKind;
  value?: number;       // số lượng/%, tùy effect
  durationMs?: number;  // thời gian hiệu lực nếu có
}

export interface CardDef {
  id: string;           // 'R1', 'F3'...
  name: string;
  style: Style;         // thuộc pool style nào
  content: ContentType; // dùng cho counter triangle + combo + AI sinh câu
  cost: number;         // Inspiration
  baseDmg: number;
  effects: CardEffect[];
  scholar?: boolean;    // card trục snowball (tăng prompt)
}

export interface Team {
  id: string;           // 'BRA', 'GER'...
  name: string;
  color: number;        // hex màu chính (Phaser dùng number)
}

export interface CombatantState {
  mf: number;             // Mental Focus hiện tại
  mfMax: number;
  inspiration: number;
  style: Style;
  styleSwitchReadyAt: number; // timestamp ms được switch tiếp
  lastCardContent: ContentType | null; // cho combo
  comboCount: number;     // 1 = chưa combo, 2/3 = chain
  lastPlayedAt: number;   // timestamp đánh card gần nhất (cho counter window đối thủ)
  shields: number;        // dmg chặn được còn lại
  marks: { value: number; expiresAt: number }[];
  silencedUntil: number;
  team: Team;
}

export interface DamageBreakdown {
  base: number;
  styleBuff: number;      // 1 hoặc 1.25
  contentCounter: number; // 1 hoặc 1.5
  comboMult: number;      // 1 / 1.25 / 2.0
  markBonus: number;      // 1 hoặc 1.1
  final: number;
  countered: boolean;
  comboLevel: number;     // 1/2/3
}

export interface RoastLine {
  text: string;
  content: ContentType;
}

export interface TrashTalkOption {
  text: string;
  kind: 'heavy' | 'recover' | 'silence' | 'quiz';
}

/** 2 phía trong trận — PVE: opponent = NPC; PVP (Phase 4): opponent = người thật */
export type Side = 'player' | 'opponent';

/** Data truyền vào BattleScene khi scene.start */
export interface BattleSceneData {
  playerStyle: Style;
}

/** Data truyền vào ResultScene khi scene.start */
export interface ResultSceneData {
  won: boolean;
}

export interface QuizQuestion {
  q: string;
  correct: string;
  wrong: string[];      // 3 đáp án nhiễu
  teamId: string;
  difficulty: 'easy' | 'medium' | 'hard';
}
