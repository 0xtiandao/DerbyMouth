// src/data/cards.ts — 20 card từ docs/CARDS.md. CHỈNH SỐ Ở ĐÂY, không hardcode trong logic.
import type { CardDef } from '../types';

export const CARDS: CardDef[] = [
  // ============ REBUTTAL POOL (reactive, thưởng đọc bài) ============
  { id: 'R1', name: 'Source?!', style: 'rebuttal', content: 'rational', cost: 2, baseDmg: 60,
    effects: [{ kind: 'counterBonus', value: 30 }] },
  { id: 'R2', name: 'Fact Check', style: 'rebuttal', content: 'rational', cost: 4, baseDmg: 80,
    effects: [{ kind: 'revealNext' }] },
  { id: 'R3', name: 'Receipts Pulled', style: 'rebuttal', content: 'emotional', cost: 5, baseDmg: 90,
    effects: [{ kind: 'silence', durationMs: 1500 }] },
  { id: 'R4', name: 'Name One Player', style: 'rebuttal', content: 'fanshaming', cost: 3, baseDmg: 70,
    effects: [{ kind: 'drainInspiration', value: 1 }] },
  { id: 'R5', name: 'Stat Slam', style: 'rebuttal', content: 'rational', cost: 6, baseDmg: 150,
    effects: [] },

  // ============ FILIBUSTER POOL (drain/stall) ============
  { id: 'F1', name: 'Yap Storm', style: 'filibuster', content: 'emotional', cost: 3, baseDmg: 50,
    effects: [{ kind: 'slowRegen', value: 30, durationMs: 5000 }] },
  { id: 'F2', name: 'Wall of Text', style: 'filibuster', content: 'rational', cost: 4, baseDmg: 60,
    effects: [{ kind: 'shield', value: 50 }] },
  { id: 'F3', name: 'Whataboutism', style: 'filibuster', content: 'emotional', cost: 2, baseDmg: 40,
    effects: [{ kind: 'recoverInspiration', value: 1 }] },
  { id: 'F4', name: 'History Lesson', style: 'filibuster', content: 'fanshaming', cost: 5, baseDmg: 100,
    effects: [{ kind: 'costUp', value: 1, durationMs: 8000 }] },
  { id: 'F5', name: 'Beer Break', style: 'filibuster', content: 'intimidation', cost: 3, baseDmg: 0,
    effects: [{ kind: 'recoverInspiration', value: 3 }] },

  // ============ BLUSTER POOL (burst damage) ============
  { id: 'B1', name: 'Trophy Cabinet', style: 'bluster', content: 'intimidation', cost: 5, baseDmg: 130,
    effects: [] },
  { id: 'B2', name: 'Net Spend Flex', style: 'bluster', content: 'intimidation', cost: 4, baseDmg: 90,
    effects: [{ kind: 'buffNext', value: 20 }] },
  { id: 'B3', name: "Ratio'd", style: 'bluster', content: 'emotional', cost: 3, baseDmg: 70,
    effects: [{ kind: 'comboFinisherX2' }] },
  { id: 'B4', name: 'Champions Anthem', style: 'bluster', content: 'intimidation', cost: 6, baseDmg: 160,
    effects: [] },
  { id: 'B5', name: 'Scoreboard', style: 'bluster', content: 'rational', cost: 2, baseDmg: 50,
    effects: [] },

  // ============ PROVOCATION POOL (bait/Scholar) ============
  { id: 'P1', name: 'Touch Grass', style: 'provocation', content: 'fanshaming', cost: 2, baseDmg: 45,
    effects: [{ kind: 'promptChanceUp', value: 15, durationMs: 10000 }], scholar: true },
  { id: 'P2', name: 'Plastic Fan Alert', style: 'provocation', content: 'fanshaming', cost: 4, baseDmg: 85,
    effects: [{ kind: 'mark', value: 10, durationMs: 6000 }] },
  { id: 'P3', name: 'Crying Jordan', style: 'provocation', content: 'emotional', cost: 3, baseDmg: 65,
    effects: [{ kind: 'npcMoodAnger' }], scholar: true },
  { id: 'P4', name: 'Bait & Switch', style: 'provocation', content: 'intimidation', cost: 4, baseDmg: 75,
    effects: [{ kind: 'switchCooldownDown', value: 5000 }] },
  { id: 'P5', name: 'Pub Quiz Challenge', style: 'provocation', content: 'fanshaming', cost: 5, baseDmg: 60,
    effects: [{ kind: 'forceQuiz', value: 80 }] }, // value = bonus dmg nếu đối thủ sai
];

export const cardsByStyle = (style: string) => CARDS.filter(c => c.style === style);
export const cardById = (id: string) => CARDS.find(c => c.id === id);
