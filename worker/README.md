# worker/ — Cloudflare Worker (AI proxy)

CHƯA ĐỤNG cho đến Phase 2 (docs/TASKS.md task 2.3).

Khi đến Phase 2:
1. `npm i -g wrangler && wrangler init`
2. `wrangler secret put AI_API_KEY` (KHÔNG hardcode key, không commit)
3. Endpoints cần build: /api/roast/batch, /api/trashtalk/batch, /api/quiz
4. Prompt + boundaries: đọc docs/PLAN.md mục 3
