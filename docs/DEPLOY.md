# DerbyMouth — Deploy (Cloudflare Pages + Worker)

> Toàn bộ free tier. Cần **đăng nhập Cloudflare** (bước duy nhất chỉ mày làm được).
> Code đã sẵn sàng: client `API_BASE` đọc `VITE_API_BASE`; worker có sẵn endpoint + binding.

## 0. Một lần: đăng nhập + rotate key
```bash
wrangler login                       # mở browser, đăng nhập Cloudflare
```
**Rotate key Virtuals trước khi public** (key cũ đã lộ trong chat). Lấy key mới ở Virtuals.

## 1. Tạo KV + D1 (cho worker)
```bash
wrangler kv namespace create CACHE
wrangler d1 create derbymouth
```
Copy 2 id trả về, dán vào `worker/wrangler.toml`:
- `kv_namespaces[0].id` ← id của CACHE
- `d1_databases[0].database_id` ← id của derbymouth
(thay 2 chỗ `LOCAL_PLACEHOLDER_REPLACE_ON_DEPLOY`)

## 2. Đặt secret AI key (KHÔNG hardcode)
```bash
wrangler secret put AI_API_KEY --config worker/wrangler.toml
# dán key Virtuals MỚI
```

## 3. Siết CORS (worker/src/index.ts)
Đổi `'access-control-allow-origin': '*'` → domain Pages thật (vd `https://derbymouth.pages.dev`).
Để `*` cũng chạy nhưng nên siết khi public.

## 4. Deploy Worker
```bash
wrangler deploy --config worker/wrangler.toml
# → https://derbymouth-worker.<subdomain>.workers.dev
```

## 5. Build + Deploy Pages (game tĩnh)
Chọn 1 trong 2 kiến trúc:

**A. Worker riêng (đơn giản nhất, khuyên):**
```bash
# build client trỏ vào worker URL ở bước 4
VITE_API_BASE=https://derbymouth-worker.<subdomain>.workers.dev npm run build
wrangler pages deploy dist --project-name derbymouth
```
Worker đã mở CORS nên Pages (origin khác) gọi được. Xong.

**B. Same-origin (gộp /api vào Pages):** dùng Pages Functions —
tạo `functions/api/[[path]].ts` re-export `worker/src/index.ts` fetch + cấu hình
KV/D1/secret trong Pages project; build `npm run build` (để VITE_API_BASE trống).
Phức tạp hơn, chỉ làm nếu muốn 1 domain duy nhất.

## 6. Kiểm tra sau deploy
- Mở URL Pages → chơi PVE → câu chửi `source: ai` (xem Network tab `/api/roast/batch`).
- Connect ví → vào D1 (`wrangler d1 execute derbymouth --command "SELECT * FROM profiles"`).
- PVP: PeerJS dùng cloud công khai, chạy ngay không cần cấu hình.

## Ghi chú
- D1 local (lúc `worker:dev`) tách biệt D1 production — schema tự tạo lazy ở cả 2.
- Rate limit 30/phút/IP + KV cache đã bật sẵn.
- `Assetgrok/` (card art, avatar, bg, style icon) + SFX procedural đi kèm trong `dist/` khi build.
