// worker/src/ai.ts — gọi AI qua Virtuals Compute (Anthropic Messages API format).
// Đổi từ Gemini sang Virtuals 2026-06-12 (Virtuals free API key cho agent).
// Key KHÔNG BAO GIỜ hardcode: local từ worker/.dev.vars, production từ
// `wrangler secret put AI_API_KEY`.
import type { Env } from './env';

const BASE_URL = 'https://compute.virtuals.io/v1';
// LƯU Ý (đo thực nghiệm, docs Virtuals ghi sai):
// - Route hoạt động: POST /v1/chat/completions (OpenAI format) — /v1/messages trả 501.
// - Auth: header x-api-key (Bearer → 404).
// - Model id KHÔNG có prefix "anthropic/" — list thật từ GET /v1/models.
// - Trả HTTP 201 khi thành công.
const DEFAULT_MODEL = 'claude-opus-4-7-fast';
const BACKUP_MODEL = 'gemini-3-flash-preview'; // primary lỗi → thử model khác hãng
const MAX_TOKENS = 2048; // batch roast lớn nhất ~48 câu JSON

/** Gọi AI: primary (retry 1 lần lỗi tạm) → backup model → throw (caller fallback). */
export async function callAI(prompt: string, env: Env): Promise<unknown> {
  const primary = env.AI_MODEL ?? DEFAULT_MODEL;
  try {
    return await callModel(prompt, primary, env, 1);
  } catch (err) {
    if (primary === BACKUP_MODEL) throw err;
    console.log(`primary model failed (${String(err)}), trying ${BACKUP_MODEL}`);
    return callModel(prompt, BACKUP_MODEL, env, 0);
  }
}

async function callModel(prompt: string, model: string, env: Env, retries: number): Promise<unknown> {
  if (!env.AI_API_KEY) throw new Error('no AI_API_KEY');

  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': env.AI_API_KEY,
    },
    body: JSON.stringify({
      model,
      max_tokens: MAX_TOKENS,
      temperature: 1, // roast cần biến tấu
      messages: [{ role: 'user', content: prompt }],
      // gateway (Venice-backed) tự chèn system prompt — tắt cho JSON output sạch
      venice_parameters: { include_venice_system_prompt: false },
    }),
  });
  if (!res.ok) {
    if (retries > 0 && (res.status >= 500 || res.status === 429)) {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      return callModel(prompt, model, env, retries - 1);
    }
    throw new Error(`virtuals ${model} http ${res.status}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('virtuals empty response');
  return parseJsonLoose(text);
}

/** Anthropic API không có chế độ ép JSON — Claude có thể bọc ```json fence
 *  hoặc thêm 1 dòng preamble. Bóc đúng mảnh JSON ra. */
function parseJsonLoose(text: string): unknown {
  const cleaned = text.replace(/```json|```/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    // tìm khối JSON đầu tiên trong text
  }
  const candidates = ['{', '[']
    .map((c) => cleaned.indexOf(c))
    .filter((i) => i !== -1);
  if (candidates.length === 0) throw new Error('no json in ai response');
  const start = Math.min(...candidates);
  const close = cleaned[start] === '{' ? '}' : ']';
  const end = cleaned.lastIndexOf(close);
  if (end <= start) throw new Error('no json in ai response');
  return JSON.parse(cleaned.slice(start, end + 1));
}
