// worker/src/index.ts — DerbyMouth AI proxy (task 2.3).
// 3 endpoint POST: /api/roast/batch · /api/trashtalk/batch · /api/quiz
// KV cache theo (content + cặp đội) + rate limit per-IP + fallback khi AI lỗi.
// Game KHÔNG BAO GIỜ gọi AI API trực tiếp từ browser — chỉ qua worker này.
import type { ContentType, QuizQuestion, TrashTalkOption } from '../../src/types';
import { FALLBACK_ROASTS, FALLBACK_TRASHTALK, SAMPLE_QUIZ } from '../../src/data/fallbackRoasts';
import type { Env } from './env';
import { callGemini } from './ai';
import { buildQuizPrompt, buildRoastPrompt, buildTrashTalkPrompt } from './prompts';
import {
  handleAuthNonce,
  handleAuthVerify,
  handleProfileGet,
  handleProfileResult,
  handleProfileSave,
} from './profile';

const CONTENT_TYPES: ContentType[] = ['rational', 'emotional', 'intimidation', 'fanshaming'];

// ----- cấu hình (số ở đây vì chỉ worker dùng) -----
const ROAST_COUNT_PER_TYPE = 12;
const ROAST_CACHE_TTL_S = 6 * 3600; // cùng cặp đội gặp lại trong 6h → khỏi gọi AI
const TT_SETS_PER_CALL = 6;
const TT_CACHE_TTL_S = 3600;
const QUIZ_POOL_PER_CALL = 8;
const QUIZ_CACHE_TTL_S = 30 * 24 * 3600; // facts lịch sử không đổi
const RATE_LIMIT_PER_MIN = 30;

const CORS_HEADERS: Record<string, string> = {
  'access-control-allow-origin': '*', // MVP local; deploy thật: giới hạn origin Pages
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'content-type, authorization',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...CORS_HEADERS },
  });
}

/** Soft rate limit per-IP bằng KV (eventually consistent — đủ chặn spam thường). */
async function isRateLimited(request: Request, env: Env): Promise<boolean> {
  const ip = request.headers.get('cf-connecting-ip') ?? 'local';
  const minute = Math.floor(Date.now() / 60000);
  const key = `rl:${ip}:${minute}`;
  const count = parseInt((await env.CACHE.get(key)) ?? '0', 10) + 1;
  await env.CACHE.put(key, String(count), { expirationTtl: 120 });
  return count > RATE_LIMIT_PER_MIN;
}

async function readJson<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}

// ================= /api/roast/batch =================
interface RoastReq {
  myTeam?: string;
  oppTeam?: string;
  count?: number;
  avoid?: string[];
}

async function handleRoastBatch(request: Request, env: Env): Promise<Response> {
  const body = (await readJson<RoastReq>(request)) ?? {};
  const myTeam = body.myTeam ?? 'my club';
  const oppTeam = body.oppTeam ?? 'their club';
  const count = Math.min(15, Math.max(6, body.count ?? ROAST_COUNT_PER_TYPE));

  // 1) thử cache từng content type
  const roasts: Partial<Record<ContentType, string[]>> = {};
  let missing = false;
  for (const content of CONTENT_TYPES) {
    const cached = await env.CACHE.get(cacheKeyRoast(content, myTeam, oppTeam));
    if (cached) roasts[content] = JSON.parse(cached) as string[];
    else missing = true;
  }
  if (!missing) return json({ roasts, source: 'cache' });

  // 2) gọi AI 1 lần cho cả 4 loại
  try {
    const ai = (await callGemini(buildRoastPrompt(myTeam, oppTeam, count, body.avoid ?? []), env)) as
      Record<string, unknown>;
    for (const content of CONTENT_TYPES) {
      const lines = ai[content];
      if (!Array.isArray(lines) || lines.length === 0) throw new Error(`bad ai shape: ${content}`);
      roasts[content] = lines.map(String);
      await env.CACHE.put(cacheKeyRoast(content, myTeam, oppTeam), JSON.stringify(roasts[content]), {
        expirationTtl: ROAST_CACHE_TTL_S,
      });
    }
    return json({ roasts, source: 'ai' });
  } catch (err) {
    // 3) AI lỗi → fallback hardcode, game không bao giờ đứng
    console.log('roast fallback:', String(err));
    for (const content of CONTENT_TYPES) roasts[content] ??= FALLBACK_ROASTS[content];
    return json({ roasts, source: 'fallback' });
  }
}

function cacheKeyRoast(content: string, myTeam: string, oppTeam: string): string {
  return `roast:${content}:${myTeam}:${oppTeam}`;
}

// ================= /api/trashtalk/batch =================
interface TrashTalkReq {
  myTeam?: string;
  oppTeam?: string;
  sets?: number;
}

async function handleTrashTalkBatch(request: Request, env: Env): Promise<Response> {
  const body = (await readJson<TrashTalkReq>(request)) ?? {};
  const myTeam = body.myTeam ?? 'my club';
  const oppTeam = body.oppTeam ?? 'their club';
  const wanted = Math.min(TT_SETS_PER_CALL, Math.max(1, body.sets ?? 3));
  const cacheKey = `tt:${myTeam}:${oppTeam}`;

  let pool: TrashTalkOption[][] | null = null;
  const cached = await env.CACHE.get(cacheKey);
  if (cached) pool = JSON.parse(cached) as TrashTalkOption[][];

  if (!pool) {
    try {
      const ai = (await callGemini(buildTrashTalkPrompt(myTeam, oppTeam, TT_SETS_PER_CALL), env)) as
        { heavy?: unknown; recover?: unknown; silence?: unknown }[];
      if (!Array.isArray(ai) || ai.length === 0) throw new Error('bad ai shape');
      pool = ai.map((set) => [
        { text: String(set.heavy ?? ''), kind: 'heavy' as const },
        { text: String(set.recover ?? ''), kind: 'recover' as const },
        { text: String(set.silence ?? ''), kind: 'silence' as const },
      ]);
      await env.CACHE.put(cacheKey, JSON.stringify(pool), { expirationTtl: TT_CACHE_TTL_S });
      return json({ sets: pickRandom(pool, wanted), source: 'ai' });
    } catch (err) {
      console.log('trashtalk fallback:', String(err));
      return json({ sets: pickRandom(FALLBACK_TRASHTALK, wanted), source: 'fallback' });
    }
  }
  return json({ sets: pickRandom(pool, wanted), source: 'cache' });
}

function pickRandom<T>(pool: T[], n: number): T[] {
  const copy = [...pool];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.min(n, copy.length));
}

// ================= /api/quiz =================
interface QuizReq {
  teamId?: string;
  teamName?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

async function handleQuiz(request: Request, env: Env): Promise<Response> {
  const body = (await readJson<QuizReq>(request)) ?? {};
  const teamId = body.teamId ?? 'UNK';
  const teamName = body.teamName ?? teamId;
  const difficulty = body.difficulty ?? 'easy';
  const cacheKey = `quiz:${teamId}:${difficulty}`;

  let pool: QuizQuestion[] | null = null;
  const cached = await env.CACHE.get(cacheKey);
  if (cached) pool = JSON.parse(cached) as QuizQuestion[];

  if (!pool) {
    try {
      const ai = (await callGemini(buildQuizPrompt(teamName, difficulty, QUIZ_POOL_PER_CALL), env)) as
        { q?: unknown; correct?: unknown; wrong?: unknown }[];
      if (!Array.isArray(ai) || ai.length === 0) throw new Error('bad ai shape');
      pool = ai
        .filter((x) => x.q && x.correct && Array.isArray(x.wrong) && (x.wrong as unknown[]).length === 3)
        .map((x) => ({
          q: String(x.q),
          correct: String(x.correct),
          wrong: (x.wrong as unknown[]).map(String),
          teamId,
          difficulty,
        }));
      if (pool.length === 0) throw new Error('all ai quiz invalid');
      await env.CACHE.put(cacheKey, JSON.stringify(pool), { expirationTtl: QUIZ_CACHE_TTL_S });
      return json({ quiz: pickRandom(pool, 1)[0], source: 'ai' });
    } catch (err) {
      console.log('quiz fallback:', String(err));
      const fallbackPool = SAMPLE_QUIZ.filter((q) => q.teamId === teamId);
      const source = fallbackPool.length > 0 ? fallbackPool : SAMPLE_QUIZ;
      return json({ quiz: pickRandom(source, 1)[0], source: 'fallback' });
    }
  }
  return json({ quiz: pickRandom(pool, 1)[0], source: 'cache' });
}

// ================= router =================
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (await isRateLimited(request, env)) return json({ error: 'rate_limited' }, 429);

    const path = new URL(request.url).pathname;

    // ----- Phase 4: auth + profile (D1) -----
    if (path === '/api/profile' && request.method === 'GET') {
      return handleProfileGet(request, env, CORS_HEADERS);
    }
    if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
    if (path === '/api/auth/nonce') return handleAuthNonce(request, env, CORS_HEADERS);
    if (path === '/api/auth/verify') return handleAuthVerify(request, env, CORS_HEADERS);
    if (path === '/api/profile') return handleProfileSave(request, env, CORS_HEADERS);
    if (path === '/api/profile/result') return handleProfileResult(request, env, CORS_HEADERS);

    // ----- Phase 2: AI proxy -----
    if (path === '/api/roast/batch') return handleRoastBatch(request, env);
    if (path === '/api/trashtalk/batch') return handleTrashTalkBatch(request, env);
    if (path === '/api/quiz') return handleQuiz(request, env);
    return json({ error: 'not_found' }, 404);
  },
};
