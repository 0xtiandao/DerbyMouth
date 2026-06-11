# DerbyMouth — TASKS (làm theo thứ tự, tick khi xong)

> Quy ước: mỗi task = 1 phiên Claude Code tập trung. Đừng gộp nhiều task 1 lúc.
> Sau mỗi task: `npm run build` sạch lỗi + test tay + commit.

## PHASE 1 — Combat skeleton (roast hardcode, không AI)

### 1.1. Project boot ✅ (đã setup sẵn)
- [x] Vite + Phaser + TS config
- [x] types.ts, cards.ts, fallbackRoasts.ts, teams.ts

### 1.2. Scene flow cơ bản ✅
- [x] BootScene: load (placeholder), chuyển MenuScene
- [x] MenuScene: title + nút "PVE Battle" → StyleSelectScene
- [x] StyleSelectScene: 4 style hiển thị vòng tròn (như ảnh WWM), chọn 1 → BattleScene
- [x] ResultScene: thắng/thua + nút chơi lại
- Placeholder: rect/circle/text, KHÔNG cần asset
- Ghi chú (2026-06-11):
  - Scene key chung ở `scenes/keys.ts`; nút tap-first dùng chung ở `scenes/ui.ts`.
  - Vòng style suy từ `STYLE_COUNTERS` (không hardcode thứ tự), mũi tên vàng = chiều khắc.
  - Thêm `STYLE_COLORS` + `STYLE_TAGLINES` vào `core/constants.ts` (màu khác CONTENT_COLORS để không nhầm 2 lớp).
  - `BattleScene` hiện là STUB (nhận playerStyle, 2 nút WIN/LOSE test) — thay bằng UI thật ở task 1.5/1.6/1.8.
  - Đã test tay full flow trong browser (Edge headless): menu → chọn style → battle → win/lose → chơi lại/menu.

### 1.3. Core: CombatEngine (pure TS, không Phaser)
- [ ] Damage formula đầy đủ (đọc CLAUDE.md + docs/CARDS.md mục 0)
- [ ] Counter window check (content type, 5s)
- [ ] Combo chain state (x2/x3, đứt khi đổi loại hoặc bị silence)
- [ ] Style buff check (RPS 4 style)
- [ ] Unit-test nhanh bằng 1 file `core/__test__.ts` chạy với tsx hoặc console (không cần framework)

### 1.4. Core: InspirationSystem + StyleSystem
- [ ] Inspiration: max 10, regen +1/2s, trừ theo cost, chặn chơi card khi thiếu
- [ ] StyleSystem: style hiện tại 2 bên, switch cooldown 15s, event khi switch

### 1.5. BattleScene — dựng UI (placeholder graphics)
- [ ] MF bar 2 bên (NPC trên, player dưới trái)
- [ ] Inspiration bubble: số + vòng regen quay quanh (Phaser Arc)
- [ ] Style indicator 2 bên + nút switch (sáng khi hết cooldown, vòng đếm ngược)
- [ ] Hand 4 card: khung + cost + tên + content type màu (Blue/Pink/Red/Green)
- [ ] Timer trận trên góc phải

### 1.6. BattleScene — chơi card
- [ ] Tap card → check Inspiration → trừ cost → lấy câu roast từ fallbackRoasts theo content type
- [ ] Speech bubble player (trái) hiện câu + tween pop + particle đơn giản
- [ ] Gọi CombatEngine tính dmg (style buff + counter + combo) → trừ MF NPC
- [ ] Hiện text "COUNTERED! +50%" / "COMBO x2/x3" khi trigger
- [ ] Rút lá mới từ pool style hiện tại

### 1.7. NPC brain v1 (đơn giản)
- [ ] NPC tự chơi card mỗi 3-5s (random từ pool style của nó)
- [ ] Speech bubble NPC (phải) + trừ MF player
- [ ] NPC switch style ngẫu nhiên mỗi 20-30s

### 1.8. Win/lose + sudden death
- [ ] MF về 0 → ResultScene
- [ ] Timer trận hết → drain MF cả 2 mỗi giây

**CHECKPOINT PHASE 1: chơi được 1 trận PVE đầy đủ với roast hardcode.**

## PHASE 2 — Trash Talk QTE + AI thật

### 2.1. TrashTalkQTE (core + UI)
- [ ] Trigger random khi NPC nói (base 12%/5s, đọc constants)
- [ ] Bubble NPC flash + icon + phím Q hoặc E (trái/phải) — mobile: 2 nút tap to
- [ ] Timer ngầm 1.2s, nhấn kịp → mở menu, miss → mất cơ hội
- [ ] Menu 3 option (text từ fallback trước): mạnh 150% / 40%+recover / 40%+silence
- [ ] Silence effect lên NPC (ngừng nói + không phản đòn 1.5-2s)
- [ ] Scholar card effect: tăng % trigger (đọc từ cards.ts P1/P3)

### 2.2. Quiz mechanic (PVE)
- [ ] Option quiz trong menu: câu hỏi 4 đáp án về đội NPC (data tĩnh trước, AI sau)
- [ ] NPC % trả lời đúng theo độ khó; sai = +80 dmg + badge "fan nửa mùa" hiện trên đầu

### 2.3. Cloudflare Worker (thư mục worker/)
- [ ] wrangler init, endpoint /api/roast/batch + /api/trashtalk/batch + /api/quiz
- [ ] Secret AI_API_KEY (wrangler secret put), KHÔNG hardcode
- [ ] Prompt theo docs/PLAN.md mục 3 (4 content type + boundaries + JSON output)
- [ ] KV cache + rate limit per-IP
- [ ] Trả fallback list khi API lỗi

### 2.4. Client buffer
- [ ] api.ts: fetch batch đầu trận, buffer RAM theo content type
- [ ] Lấy câu 0ms khi chơi card, refill ngầm khi buffer < 4 câu
- [ ] Buffer riêng cho trash talk menu (bộ 3 câu)
- [ ] Toàn bộ lỗi mạng → rơi về fallbackRoasts, game không bao giờ đứng

## PHASE 3 — Polish PVE
- [ ] Mark/debuff effects còn lại trong cards.ts (F1 slow regen, F2 shield, F4 cost+1, B2 buff next, P2 mark...)
- [ ] NPC brain v2: ưu tiên counter content type player vừa đánh, switch style có logic
- [ ] Reward screen + local stats (localStorage)

## PHASE 4 — Account + Wallet + PVP
- [ ] Profile: chọn đội (teams.ts), lưu D1; wallet auth (SIWS/SIWE) — chọn chain trước khi làm
- [ ] PeerJS room code, sync action, quiz PVP có timer trả lời thật
- [ ] Lock action theo nhịp ngắn chống desync

## PHASE 5 — Art + Audio + Deploy
- [ ] Thay placeholder bằng asset thật (docs/PLAN.md mục 6 có hướng dẫn tạo từng asset)
- [ ] SFX + deploy Cloudflare Pages + Worker
