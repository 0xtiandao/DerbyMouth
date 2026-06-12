// worker/src/env.ts — type cho env binding. Khai báo KV tối thiểu thay vì
// thêm devDependency @cloudflare/workers-types (đủ dùng cho project này).

export interface KVNamespaceLite {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}

/** D1 tối thiểu (đủ dùng, khỏi thêm @cloudflare/workers-types). */
export interface D1PreparedLite {
  bind(...args: unknown[]): D1PreparedLite;
  first<T = unknown>(): Promise<T | null>;
  run(): Promise<unknown>;
}
export interface D1DatabaseLite {
  prepare(sql: string): D1PreparedLite;
}

export interface Env {
  /** Key Virtuals Compute. Local: worker/.dev.vars (gitignored). Deploy: `wrangler secret put AI_API_KEY`. */
  AI_API_KEY?: string;
  /** Override model nếu cần (mặc định anthropic/claude-sonnet-4-5 qua Virtuals). */
  AI_MODEL?: string;
  CACHE: KVNamespaceLite;
  DB: D1DatabaseLite;
}
