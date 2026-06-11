// src/core/quiz.ts — quiz mechanic PVE (task 2.2). Pure TS, RNG inject được.
// PVP (Phase 4): đối thủ thật trả lời — không dùng resolveNpcAnswer.
import type { QuizQuestion } from '../types';
import { BALANCE } from './constants';
import { SAMPLE_QUIZ } from '../data/fallbackRoasts';

/** % NPC trả lời đúng theo độ khó (đọc constants). */
export function npcCorrectChance(difficulty: QuizQuestion['difficulty']): number {
  if (difficulty === 'hard') return BALANCE.QUIZ_NPC_CORRECT_HARD;
  if (difficulty === 'medium') return BALANCE.QUIZ_NPC_CORRECT_MEDIUM;
  return BALANCE.QUIZ_NPC_CORRECT_EASY;
}

/** Chọn quiz về đúng đội NPC nếu có trong pool, không thì random (Phase 2.3: AI sinh theo đội). */
export function pickQuizFor(teamId: string, rng: () => number = Math.random): QuizQuestion {
  const pool = SAMPLE_QUIZ.filter((q) => q.teamId === teamId);
  const source = pool.length > 0 ? pool : SAMPLE_QUIZ;
  return source[Math.floor(rng() * source.length)];
}

export interface NpcQuizAnswer {
  correct: boolean;
  answer: string; // đáp án NPC chọn (đúng = q.correct, sai = 1 trong q.wrong)
}

/** PVE: NPC trả lời theo % độ khó. Sai → chọn random 1 đáp án nhiễu. */
export function resolveNpcAnswer(q: QuizQuestion, rng: () => number = Math.random): NpcQuizAnswer {
  if (rng() < npcCorrectChance(q.difficulty)) {
    return { correct: true, answer: q.correct };
  }
  return { correct: false, answer: q.wrong[Math.floor(rng() * q.wrong.length)] };
}

/** 4 đáp án trộn thứ tự để hiển thị. */
export function shuffledAnswers(q: QuizQuestion, rng: () => number = Math.random): string[] {
  const all = [q.correct, ...q.wrong];
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all;
}
