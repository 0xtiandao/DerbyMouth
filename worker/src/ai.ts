// worker/src/ai.ts — gọi Gemini API. Key KHÔNG BAO GIỜ hardcode:
// local từ worker/.dev.vars, production từ `wrangler secret put AI_API_KEY`.
import type { Env } from './env';

const DEFAULT_MODEL = 'gemini-2.5-flash'; // docs/PLAN.md mục 4
const BACKUP_MODEL = 'gemini-2.5-flash-lite'; // primary quá tải (503) → thử model nhẹ

/** Gọi Gemini: primary (retry 1 lần lỗi tạm) → backup model → throw (caller fallback). */
export async function callGemini(prompt: string, env: Env): Promise<unknown> {
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

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-goog-api-key': env.AI_API_KEY,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 1.1, // roast cần biến tấu
        },
      }),
    },
  );
  if (!res.ok) {
    if (retries > 0 && (res.status >= 500 || res.status === 429)) {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      return callModel(prompt, model, env, retries - 1);
    }
    throw new Error(`gemini ${model} http ${res.status}`);
  }

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('gemini empty response');
  return JSON.parse(text);
}
