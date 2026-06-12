// worker/src/profile.ts — wallet auth (SIWE-lite, EVM/MetaMask) + profile/stats trên D1 (Phase 4).
// Flow: POST /api/auth/nonce → client personal_sign message chứa nonce →
// POST /api/auth/verify (viem verifyMessage) → session token (KV, 7 ngày) →
// GET/POST /api/profile + POST /api/profile/result với Bearer token.
// User ID = wallet address ngay từ đầu (PLAN 2.5 — sau này airdrop không cần migrate).
import { verifyMessage } from 'viem';
import type { Env } from './env';

const NONCE_TTL_S = 300;
const SESSION_TTL_S = 7 * 24 * 3600;

export interface ProfileRow {
  address: string;
  team_id: string | null;
  wins: number;
  losses: number;
  streak: number;
  best_streak: number;
  quiz_stumped: number;
}

function json(body: unknown, status = 200, cors: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...cors },
  });
}

async function readJson<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}

/** Tạo bảng lazy — khỏi cần migration tooling cho local dev. */
async function ensureSchema(env: Env): Promise<void> {
  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS profiles (
      address TEXT PRIMARY KEY,
      team_id TEXT,
      wins INTEGER NOT NULL DEFAULT 0,
      losses INTEGER NOT NULL DEFAULT 0,
      streak INTEGER NOT NULL DEFAULT 0,
      best_streak INTEGER NOT NULL DEFAULT 0,
      quiz_stumped INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    )`,
  ).run();
}

/** Message client phải ký — chứa address + nonce chống replay. */
export function buildLoginMessage(address: string, nonce: string): string {
  return `DerbyMouth wants you to sign in.\nAddress: ${address}\nNonce: ${nonce}`;
}

export async function handleAuthNonce(request: Request, env: Env, cors: Record<string, string>): Promise<Response> {
  const body = await readJson<{ address?: string }>(request);
  const address = body?.address?.toLowerCase();
  if (!address || !/^0x[0-9a-f]{40}$/.test(address)) return json({ error: 'bad_address' }, 400, cors);

  const nonce = crypto.randomUUID().slice(0, 8);
  await env.CACHE.put(`nonce:${address}`, nonce, { expirationTtl: NONCE_TTL_S });
  return json({ nonce, message: buildLoginMessage(address, nonce) }, 200, cors);
}

export async function handleAuthVerify(request: Request, env: Env, cors: Record<string, string>): Promise<Response> {
  const body = await readJson<{ address?: string; signature?: string }>(request);
  const address = body?.address?.toLowerCase();
  const signature = body?.signature;
  if (!address || !signature) return json({ error: 'bad_request' }, 400, cors);

  const nonce = await env.CACHE.get(`nonce:${address}`);
  if (!nonce) return json({ error: 'nonce_expired' }, 401, cors);

  const ok = await verifyMessage({
    address: address as `0x${string}`,
    message: buildLoginMessage(address, nonce),
    signature: signature as `0x${string}`,
  }).catch(() => false);
  if (!ok) return json({ error: 'bad_signature' }, 401, cors);

  await env.CACHE.delete(`nonce:${address}`); // nonce dùng 1 lần
  const token = crypto.randomUUID();
  await env.CACHE.put(`session:${token}`, address, { expirationTtl: SESSION_TTL_S });

  await ensureSchema(env);
  await env.DB.prepare(
    'INSERT INTO profiles (address, created_at) VALUES (?, ?) ON CONFLICT(address) DO NOTHING',
  )
    .bind(address, Date.now())
    .run();

  return json({ token, address }, 200, cors);
}

/** Đọc address từ Bearer token; null nếu không có session. */
async function sessionAddress(request: Request, env: Env): Promise<string | null> {
  const auth = request.headers.get('authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;
  return env.CACHE.get(`session:${token}`);
}

export async function handleProfileGet(request: Request, env: Env, cors: Record<string, string>): Promise<Response> {
  const address = await sessionAddress(request, env);
  if (!address) return json({ error: 'unauthorized' }, 401, cors);
  await ensureSchema(env);
  const row = await env.DB.prepare('SELECT * FROM profiles WHERE address = ?')
    .bind(address)
    .first<ProfileRow>();
  return json({ profile: row }, 200, cors);
}

export async function handleProfileSave(request: Request, env: Env, cors: Record<string, string>): Promise<Response> {
  const address = await sessionAddress(request, env);
  if (!address) return json({ error: 'unauthorized' }, 401, cors);
  const body = await readJson<{ teamId?: string }>(request);
  if (!body?.teamId) return json({ error: 'bad_request' }, 400, cors);
  await ensureSchema(env);
  await env.DB.prepare('UPDATE profiles SET team_id = ? WHERE address = ?')
    .bind(body.teamId, address)
    .run();
  return json({ ok: true }, 200, cors);
}

/** Ghi kết quả trận (stats on-record — căn cứ airdrop sau này, PLAN 2.5). */
export async function handleProfileResult(request: Request, env: Env, cors: Record<string, string>): Promise<Response> {
  const address = await sessionAddress(request, env);
  if (!address) return json({ error: 'unauthorized' }, 401, cors);
  const body = await readJson<{ won?: boolean; quizStumped?: number }>(request);
  if (body === null || typeof body.won !== 'boolean') return json({ error: 'bad_request' }, 400, cors);
  await ensureSchema(env);
  if (body.won) {
    await env.DB.prepare(
      `UPDATE profiles SET wins = wins + 1, streak = streak + 1,
       best_streak = MAX(best_streak, streak + 1),
       quiz_stumped = quiz_stumped + ? WHERE address = ?`,
    )
      .bind(body.quizStumped ?? 0, address)
      .run();
  } else {
    await env.DB.prepare(
      'UPDATE profiles SET losses = losses + 1, streak = 0, quiz_stumped = quiz_stumped + ? WHERE address = ?',
    )
      .bind(body.quizStumped ?? 0, address)
      .run();
  }
  const row = await env.DB.prepare('SELECT * FROM profiles WHERE address = ?')
    .bind(address)
    .first<ProfileRow>();
  return json({ profile: row }, 200, cors);
}
