// src/api.ts — client buffer cho AI roast (task 2.4).
// Nguyên tắc: lấy câu 0ms từ RAM (không bao giờ chờ mạng giữa trận), refill ngầm
// khi buffer thấp, MỌI lỗi mạng → fallback hardcode — game không bao giờ đứng.
import type { ContentType, QuizQuestion, Team, TrashTalkOption } from './types';
import { FALLBACK_ROASTS, FALLBACK_TRASHTALK } from './data/fallbackRoasts';
import { pickQuizFor } from './core/quiz';

// Local dev: worker chạy riêng cổng 8787 (`npm run worker:dev`).
// Deploy (Phase 5): cùng origin, route /api/* → worker.
export const API_BASE =
  typeof location !== 'undefined' && ['localhost', '127.0.0.1'].includes(location.hostname)
    ? 'http://127.0.0.1:8787'
    : '';

const LOW_WATER = 4; // buffer content type < 4 câu → refill ngầm
const TT_LOW_WATER = 2; // còn < 2 bộ trash talk → refill
const QUIZ_LOW_WATER = 1;
const FETCH_TIMEOUT_MS = 25000; // batch AI lạnh (chưa cache) mất 15-20s — buffer chạy ngầm nên chờ được
const RECENT_KEEP = 8; // gửi 8 câu gần nhất lên worker để AI né lặp

const CONTENT_TYPES: ContentType[] = ['rational', 'emotional', 'intimidation', 'fanshaming'];

export type LineSource = 'ai' | 'fallback';

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`api ${path} http ${res.status}`);
  return (await res.json()) as T;
}

/** Buffer roast 1 CHIỀU (người nói cố định) — tạo 2 instance: player nói và NPC nói. */
export class RoastBuffer {
  private readonly buffers: Record<ContentType, string[]> = {
    rational: [],
    emotional: [],
    intimidation: [],
    fanshaming: [],
  };
  private ttSets: TrashTalkOption[][] = [];
  private quizzes: QuizQuestion[] = [];
  private recent: string[] = [];
  private refilling = false;
  private ttRefilling = false;
  private quizRefilling = false;

  constructor(
    private readonly myTeam: Team, // đội của NGƯỜI NÓI
    private readonly oppTeam: Team, // đội bị chửi
  ) {}

  /** Gọi đầu trận, KHÔNG await — fallback gánh cho tới khi buffer sẵn sàng. */
  primeRoasts(): void {
    void this.refillRoasts();
  }

  /** Buffer riêng cho trash talk menu + quiz (chỉ phía player cần). */
  primeTrashTalkAndQuiz(): void {
    void this.refillTrashTalk();
    void this.refillQuiz();
  }

  /** Lấy câu roast 0ms. Buffer rỗng → fallback hardcode ngay. */
  nextRoast(content: ContentType): { text: string; source: LineSource } {
    const buf = this.buffers[content];
    let result: { text: string; source: LineSource };
    if (buf.length > 0) {
      result = { text: buf.shift()!, source: 'ai' };
    } else {
      const pool = FALLBACK_ROASTS[content];
      result = { text: pool[Math.floor(Math.random() * pool.length)], source: 'fallback' };
    }
    this.recent.push(result.text);
    if (this.recent.length > RECENT_KEEP) this.recent.shift();
    if (buf.length < LOW_WATER) void this.refillRoasts();
    return result;
  }

  /** Bộ 3 option trash talk — sẵn TỨC THÌ khi nhấn kịp Q/E. */
  nextTrashTalkSet(): { set: TrashTalkOption[]; source: LineSource } {
    let result: { set: TrashTalkOption[]; source: LineSource };
    if (this.ttSets.length > 0) {
      result = { set: this.ttSets.shift()!, source: 'ai' };
    } else {
      const set = FALLBACK_TRASHTALK[Math.floor(Math.random() * FALLBACK_TRASHTALK.length)];
      result = { set, source: 'fallback' };
    }
    if (this.ttSets.length < TT_LOW_WATER) void this.refillTrashTalk();
    return result;
  }

  /** Quiz về oppTeam. Buffer rỗng → fallback pool tĩnh (core/quiz). */
  nextQuiz(): { quiz: QuizQuestion; source: LineSource } {
    let result: { quiz: QuizQuestion; source: LineSource };
    if (this.quizzes.length > 0) {
      result = { quiz: this.quizzes.shift()!, source: 'ai' };
    } else {
      result = { quiz: pickQuizFor(this.oppTeam.id), source: 'fallback' };
    }
    if (this.quizzes.length < QUIZ_LOW_WATER) void this.refillQuiz();
    return result;
  }

  private async refillRoasts(): Promise<void> {
    if (this.refilling) return;
    this.refilling = true;
    try {
      const data = await post<{ roasts: Partial<Record<ContentType, string[]>> }>(
        '/api/roast/batch',
        { myTeam: this.myTeam.name, oppTeam: this.oppTeam.name, avoid: this.recent },
      );
      for (const content of CONTENT_TYPES) {
        const lines = data.roasts[content];
        if (Array.isArray(lines)) this.buffers[content].push(...lines.map(String));
      }
      console.log(`[api] roast buffer refilled (${this.myTeam.id}→${this.oppTeam.id})`);
    } catch (err) {
      console.log(`[api] roast refill failed (${this.myTeam.id}→${this.oppTeam.id}):`, String(err));
    } finally {
      this.refilling = false;
    }
  }

  private async refillTrashTalk(): Promise<void> {
    if (this.ttRefilling) return;
    this.ttRefilling = true;
    try {
      const data = await post<{ sets: TrashTalkOption[][] }>('/api/trashtalk/batch', {
        myTeam: this.myTeam.name,
        oppTeam: this.oppTeam.name,
        sets: 3,
      });
      if (Array.isArray(data.sets)) this.ttSets.push(...data.sets);
      console.log('[api] trashtalk buffer refilled');
    } catch (err) {
      console.log('[api] trashtalk refill failed:', String(err));
    } finally {
      this.ttRefilling = false;
    }
  }

  private async refillQuiz(): Promise<void> {
    if (this.quizRefilling) return;
    this.quizRefilling = true;
    try {
      const data = await post<{ quiz: QuizQuestion }>('/api/quiz', {
        teamId: this.oppTeam.id,
        teamName: this.oppTeam.name,
        difficulty: 'easy',
      });
      if (data.quiz?.q) this.quizzes.push(data.quiz);
      console.log('[api] quiz buffer refilled');
    } catch (err) {
      console.log('[api] quiz refill failed:', String(err));
    } finally {
      this.quizRefilling = false;
    }
  }
}
