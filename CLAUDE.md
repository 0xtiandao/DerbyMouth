# CLAUDE.md — DerbyMouth

## Project là gì
DerbyMouth: web game 1v1 real-time "cãi lộn bóng đá" (pub banter battle) cho World Cup 2026.
Cơ chế lấy cảm hứng từ Gift of Gab (Where Winds Meet): card + Inspiration (mana) +
Mental Focus (máu) + Trash Talk QTE (Q/E) + style switching.
Câu roast do AI sinh động qua Cloudflare Worker proxy (KHÔNG BAO GIỜ gọi AI API trực tiếp
từ browser — lộ key).

## Đọc gì trước khi code
1. `docs/PLAN.md` — toàn bộ game design + kiến trúc + roadmap. ĐỌC TRƯỚC TIÊN.
2. `docs/CARDS.md` — 20 card + công thức damage + thông số baseline.
3. `docs/TASKS.md` — checklist theo phase. Làm theo THỨ TỰ, tick khi xong.

## Stack
- Phaser 3 + TypeScript + Vite (game client)
- Cloudflare Workers + KV (AI proxy, Phase 2) — code trong `worker/`
- PeerJS (PVP, Phase 4)
- Deploy: Cloudflare Pages

## Lệnh
```bash
npm run dev      # dev server (Vite)
npm run build    # build production
npm run preview  # test bản build
```

## Cấu trúc
```
src/
  main.ts            # Phaser config + khởi động
  types.ts           # TẤT CẢ types dùng chung — sửa ở đây trước khi thêm type mới
  scenes/            # BootScene, MenuScene, StyleSelectScene, BattleScene, ResultScene
  core/              # logic thuần (KHÔNG import Phaser nếu tránh được — để test dễ)
    CombatEngine.ts  # damage formula, counter, combo, style buff
    InspirationSystem.ts
    StyleSystem.ts   # 4 style, RPS, switch cooldown 15s
    TrashTalkQTE.ts  # Q/E prompt + menu
    NpcBrain.ts      # NPC chọn card/style
  data/
    cards.ts         # 20 card data-driven — CHỈNH SỐ Ở ĐÂY, không hardcode trong logic
    fallbackRoasts.ts# roast hardcode cho Phase 1 + fallback khi API lỗi
    teams.ts         # đội World Cup 2026
  pvp/               # PeerJS (Phase 4, chưa đụng)
worker/              # Cloudflare Worker (Phase 2, chưa đụng)
```

## Quy tắc code (BẮT BUỘC)
1. **Data-driven**: mọi con số cân bằng (dmg, cost, cooldown, multiplier) nằm trong
   `data/cards.ts` hoặc `core/constants.ts`. Logic đọc từ data, không hardcode.
2. **core/ không phụ thuộc Phaser** ở mức tối đa: CombatEngine, StyleSystem... là pure TS,
   scene chỉ là lớp hiển thị gọi vào core. Lý do: test logic không cần browser.
3. **Commit nhỏ, message rõ**: `feat(combat): counter window check`, `fix(qte): timer leak`.
4. **Không thêm thư viện mới** nếu Phaser/TS làm được. Hỏi trước khi npm install.
5. **Mobile-first**: mọi UI phải hoạt động với tap (Q/E trên mobile = 2 nút tap to bên trái/phải màn hình).
6. Tiếng Việt cho comment quan trọng, tiếng Anh cho tên biến/hàm.
7. **KHÔNG commit API key, .env, .dev.vars** — đã có trong .gitignore, đừng bypass.
8. **Scene mới (chống mờ chữ)**: gọi `setupView(this)` đầu `create()`, đặt toạ độ theo
   `VIEW.W/H` từ `core/view.ts` (KHÔNG dùng `this.scale.width/height` — framebuffer to gấp
   RENDER_SCALE lần), tạo chữ bằng `addText()` từ `scenes/ui.ts` thay vì `this.add.text`.

## Thông số gameplay hiện tại (nguồn: docs/CARDS.md — đọc bảng đầy đủ ở đó)
- MF (máu): 1000 | Inspiration max: 10, regen +1/2s | Hand: 4 lá
- Style switch cooldown: 15s | Counter window: 5s
- finalDmg = base × styleBuff(1.25) × contentCounter(1.5) × combo(1.25/2.0) × mark(1.1)
- 4 style RPS: Rebuttal > Filibuster > Bluster > Provocation > Rebuttal
- Content counter: Rational > Intimidation > Emotional > Fan-Shaming > Rational

## Trạng thái hiện tại
- Phase: **1 — Combat skeleton với roast hardcode** (chưa cắm AI)
- `cards.ts`, `fallbackRoasts.ts`, `types.ts` đã có sẵn data — DÙNG chúng, đừng viết lại.
- Asset chưa có → dùng placeholder (Phaser graphics: rect/circle màu) cho đến Phase 5.

## Định nghĩa "xong" cho mỗi task
- `npm run build` không lỗi TS
- Chạy được trong browser, test bằng tay flow liên quan
- Số liệu lấy từ data file, không hardcode
- Tick checkbox trong docs/TASKS.md + ghi chú ngắn nếu có quyết định thiết kế
