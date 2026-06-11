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

### 1.3. Core: CombatEngine (pure TS, không Phaser) ✅
- [x] Damage formula đầy đủ (đọc CLAUDE.md + docs/CARDS.md mục 0)
- [x] Counter window check (content type, 5s)
- [x] Combo chain state (x2/x3, đứt khi đổi loại hoặc bị silence)
- [x] Style buff check (RPS 4 style)
- [x] Unit-test nhanh bằng 1 file `core/__test__.ts` chạy với tsx hoặc console (không cần framework)
- Ghi chú (2026-06-11) — quyết định thiết kế:
  - Mọi hàm nhận `now` từ ngoài (không tự đọc đồng hồ) → test được bằng mốc giả.
  - Sau combo x3 (finale) chuỗi RESET — card thứ 4 cùng loại bắt đầu chuỗi mới level 1.
  - `counterBonus` (R1) cộng vào base TRƯỚC khi nhân; `comboFinisherX2` (B3) gộp vào comboMult
    → giữ invariant: final = round(tích 5 cột breakdown).
  - markBonus tính từ `mark.value` trong card data (P2: 10 → ×1.1), lấy mark mạnh nhất nếu nhiều.
  - Shield (F2) chặn ĐÚNG 1 đòn rồi mất hết (kể cả chặn chưa đủ); đòn 0 dmg không tốn shield.
  - Silence tự breakCombo (PLAN 2.6). Inspiration cost CHƯA trừ ở đây — task 1.4.
  - `npm test` = npx tsx (không thêm devDependency). 36 test pass.

### 1.4. Core: InspirationSystem + StyleSystem ✅
- [x] Inspiration: max 10, regen +1/2s, trừ theo cost, chặn chơi card khi thiếu
- [x] StyleSystem: style hiện tại 2 bên, switch cooldown 15s, event khi switch
- Ghi chú (2026-06-11) — quyết định thiết kế:
  - InspirationSystem: 1 instance/combatant, `tick(now)` bù được nhiều mốc nếu frame trễ;
    khi đầy max vòng regen đứng yên (progress 0), tụt xuống mới đếm lại.
  - Khởi đầu trận: Inspiration ĐẦY (10) — tune sau nếu mở trận quá nhanh.
  - `regenProgress()`/`cooldownProgress()` trả 0..1 sẵn cho vòng tròn UI (task 1.5).
  - StyleSystem quản lý CẢ 2 bên (Record<Side,...>), event listener thuần (không Phaser),
    `advantage()` trả bên đang khắc cho UI buff. Switch trùng style → false, không tốn cooldown.
  - Hook Phase 3 đánh dấu sẵn trong code: F1 slowRegen (intervalMs), P4 switchCooldownDown (switchTo).
  - Tổng test core: 81 pass (`npm test`).

### 1.5. BattleScene — dựng UI (placeholder graphics) ✅
- [x] MF bar 2 bên (NPC trên, player dưới trái)
- [x] Inspiration bubble: số + vòng regen quay quanh (Phaser Arc)
- [x] Style indicator 2 bên + nút switch (sáng khi hết cooldown, vòng đếm ngược)
- [x] Hand 4 card: khung + cost + tên + content type màu (Blue/Pink/Red/Green)
- [x] Timer trận trên góc phải
- Ghi chú (2026-06-11):
  - Widget tách riêng `scenes/battle/widgets.ts` (MfBar/InspirationBubble/StyleIndicator/
    StyleSwitchButton/CardView) — chỉ hiển thị, nhận giá trị qua `refresh()`; Phase 5 thay asset ở đây.
  - Nút switch: tap khi sáng → picker 3 style còn lại pop lên, chọn → StyleSystem.switchTo.
    Đã test tay: switch Rebuttal→Filibuster ăn cooldown mới + badge "+25%" hiện đúng khi khắc NPC.
  - StyleIndicator kèm badge "▲ +25% style advantage" (đọc từ BALANCE.STYLE_BUFF) khi advantage().
  - Hand 1.5 = 4 lá random từ pool style chọn; thiếu Inspiration → card mờ (alpha 0.4).
    Rút lá khi chơi = task 1.6. Đội 2 bên random từ teams.ts (profile thật = Phase 4).
  - Nút WIN/LOSE (test) còn ở top-center — xóa ở task 1.8.

### 1.6. BattleScene — chơi card ✅
- [x] Tap card → check Inspiration → trừ cost → lấy câu roast từ fallbackRoasts theo content type
- [x] Speech bubble player (trái) hiện câu + tween pop + particle đơn giản
- [x] Gọi CombatEngine tính dmg (style buff + counter + combo) → trừ MF NPC
- [x] Hiện text "COUNTERED! +50%" / "COMBO x2/x3" khi trigger
- [x] Rút lá mới từ pool style hiện tại
- Ghi chú (2026-06-11):
  - SpeechBubble widget generic (trái/phải) — NPC dùng lại ở task 1.7.
  - Effect tức thì core đã hỗ trợ áp luôn: silence (R3, float "SILENCED"), recoverInspiration
    (F3/F5, float +N ở bubble), drainInspiration (R4). Còn lại đúng roadmap Phase 2/3.
  - Thiếu Inspiration → lá rung (shake tween), không mất gì. Roast né lặp câu liền trước.
  - Rút lá tránh trùng lá đang cầm slot khác; lá mới pop scale tween.
  - Screen shake nhẹ khi COUNTERED hoặc combo x3. Damage float jitter ngang chống đè số.
  - Test tay verify: -80 → combo x2 -75 (60×1.25) → combo x3 -160 (80×2.0), MF 685 khớp;
    Inspiration 0 → hand mờ + chặn. COUNTERED chưa trigger được vì NPC chưa đánh (task 1.7).

### 1.7. NPC brain v1 (đơn giản) ✅
- [x] NPC tự chơi card mỗi 3-5s (random từ pool style của nó)
- [x] Speech bubble NPC (phải) + trừ MF player
- [x] NPC switch style ngẫu nhiên mỗi 20-30s
- Ghi chú (2026-06-11):
  - `core/NpcBrain.ts` pure TS, RNG inject được → test deterministic (19 test mới, tổng 100).
  - Brain trả NpcAction[] (switch/play), scene thực thi: switch qua StyleSystem (tự enforce
    cooldown 15s — interval 20-30s luôn thỏa), play đi CÙNG đường resolveCardPlay với player.
  - Chỉ chọn lá affordable; nghèo → retry sau NPC_POOR_RETRY_MS (1s, thêm vào BALANCE).
  - Bị silence: không nói nhưng VẪN switch được; nextPlayAt không dời → hết câm nói liền.
  - playCard/pickRoast/feedback/effects tổng quát hoá theo Side — {OPP}/{MY} đảo đúng người nói,
    HIT_POS riêng từng bên, player bị NPC silence sẽ thấy float "SILENCED" khi tap.
  - StyleSystem.onSwitch → float "→ StyleName" cả 2 bên.
  - Test tay: NPC nói mỗi 3-5s pool đúng style, switch Rebuttal→Filibuster lúc ~25s,
    badge +25% phía player TỰ BẬT đúng RPS, MF player giảm từng đòn khớp số.
- (extra, theo yêu cầu) Banter log: panel lịch sử hội thoại bên phải dưới timer,
  style chat WWM — avatar tròn màu đội + tên + mốc giờ trận + bong bóng tin nhắn bo góc
  (viền màu content type, nền tối chữ sáng); player căn phải, NPC căn trái; entry mới
  vào đáy, cũ đẩy lên + mờ nhẹ, tràn khung thì bỏ. NPC bubble dời lên trên avatar.

### 1.8. Win/lose + sudden death ✅
- [x] MF về 0 → ResultScene
- [x] Timer trận hết → drain MF cả 2 mỗi giây
- Ghi chú (2026-06-11):
  - MF về 0 → đóng băng trận 1.2s + "KNOCKOUT!" giữa màn + screen shake → ResultScene.
  - Sudden death: timer thành "SUDDEN DEATH" đỏ nhấp nháy, drain 25/s cả 2 bên
    (SUDDEN_DEATH_DRAIN_PER_SEC, XUYÊN shield — chỉ đòn đánh mới bị shield chặn),
    bù tick nếu frame trễ, float -25 cạnh 2 thanh MF.
  - Cả 2 cùng về 0 một tick (chỉ xảy ra khi drain) → ƯU ÁI PLAYER thắng.
  - Đã xóa 2 nút WIN/LOSE test.
  - Test tay (hạ tạm MF 200 + timer 15s rồi revert): KO thắng ✓, NPC giết player → LOSE ✓,
    sudden death drain đồng bộ 2 bar → tie → WIN ✓.

**CHECKPOINT PHASE 1 ĐẠT (2026-06-11): chơi được 1 trận PVE đầy đủ với roast hardcode.** ✅

## PHASE 2 — Trash Talk QTE + AI thật

### 2.1. TrashTalkQTE (core + UI) ✅
- [x] Trigger random khi NPC nói (base 12%/5s, đọc constants)
- [x] Bubble NPC flash + icon + phím Q hoặc E (trái/phải) — mobile: 2 nút tap to
- [x] Timer ngầm 1.2s, nhấn kịp → mở menu, miss → mất cơ hội
- [x] Menu 3 option (text từ fallback trước): mạnh 150% / 40%+recover / 40%+silence
- [x] Silence effect lên NPC (ngừng nói + không phản đòn 1.5-2s)
- [x] Scholar card effect: tăng % trigger (đọc từ cards.ts P1/P3)
- Ghi chú (2026-06-12) — quyết định thiết kế:
  - `core/TrashTalkQTE.ts`: state machine idle→prompt→menu, RNG inject, 25 test mới (tổng 125).
  - "NPC đang nói" = có đánh card trong 5s gần nhất + không bị câm.
  - NHẤN SAI PHÍM = mất cơ hội (commit theo read) — hiện "WRONG KEY".
  - Menu tự đóng sau TT_MENU_TIMEOUT_MS 5s (thanh countdown); game vẫn real-time phía sau.
  - Trash talk = free damage: không tốn Inspiration, KHÔNG đụng combo chain.
  - Option recover hồi TT_RECOVER_INSPIRATION 3; P3 anger = +PROMPT_ANGER_BONUS 10% trong 12s
    (2 hằng mới). Câu đã chọn hiện lên bubble player + banter log với accent VÀNG.
  - UI `scenes/battle/qte.ts`: 2 nút Q/E to 2 bên (tap = mobile), nút cần nhấn pulse + vòng đếm,
    nút kia mờ; NPC bubble flash khi prompt.
  - Test tay (chance 1.0 + window 4s tạm, revert rồi): prompt ✓ miss ✓ wrong key ✓ menu 3 option
    đúng tag ✓ pick recover → -40 MF + log vàng + không tốn Inspiration ✓.

### 2.2. Quiz mechanic (PVE) ✅
- [x] Option quiz trong menu: câu hỏi 4 đáp án về đội NPC (data tĩnh trước, AI sau)
- [x] NPC % trả lời đúng theo độ khó; sai = +80 dmg + badge "fan nửa mùa" hiện trên đầu
- Ghi chú (2026-06-12) — quyết định thiết kế:
  - `core/quiz.ts`: npcCorrectChance (easy 65/medium 45/hard 25%), pickQuizFor (ưu tiên đội NPC,
    fallback pool chung), resolveNpcAnswer, shuffledAnswers — RNG inject, 12 test (tổng 137).
  - Quiz option THAY slot heavy trong menu (TT_QUIZ_OPTION_CHANCE 35%) — cùng slot risk cao.
  - NPC đúng → phản QUIZ_CORRECT_REFLECT_DMG 60 lên player ("-60 REFLECT").
  - NPC sai → +80 dmg + badge "🤡 PLASTIC FAN" trên đầu 8s KÈM mark +10% (tận dụng cơ chế
    mark có sẵn — badge vừa nhục vừa là debuff thật).
  - P5 Pub Quiz Challenge (forceQuiz) wire luôn vào cùng đường runQuiz.
  - Câu hỏi + câu trả lời NPC đều vào banter log (hỏi accent xanh lá; NPC sai accent đỏ).
  - UI `scenes/battle/quiz.ts`: panel 4 đáp án 2x2, NPC nghĩ 1.6s → highlight → reveal màu.
  - Test tay: NPC đúng (reflect -60 ✓ MF khớp) + NPC sai (-80 + badge + đòn sau dính mark
    45×1.25×1.1=62 ✓). Quiz đúng đội khi có (GER), fallback khi không (USA).

### 2.3. Cloudflare Worker (thư mục worker/) ✅ (local — deploy ở Phase 5)
- [x] wrangler init, endpoint /api/roast/batch + /api/trashtalk/batch + /api/quiz
- [x] Secret AI_API_KEY (wrangler secret put), KHÔNG hardcode
- [x] Prompt theo docs/PLAN.md mục 3 (4 content type + boundaries + JSON output)
- [x] KV cache + rate limit per-IP
- [x] Trả fallback list khi API lỗi
- Ghi chú (2026-06-12):
  - wrangler 4.100 devDependency (root); `npm run worker:dev` (local) + `worker:check` (tsc).
  - Local key ở `worker/.dev.vars` (gitignored, đã verify check-ignore). Deploy thật:
    `wrangler secret put AI_API_KEY` + tạo KV namespace thay LOCAL_PLACEHOLDER trong wrangler.toml
    + siết CORS origin.
  - Roast: 1 call Gemini sinh CẢ 4 content type × 12 câu (ít call → rẻ), cache KV theo
    (content + cặp đội) TTL 6h. Trash talk: pool 6 bộ/call TTL 1h. Quiz: pool 8 câu/đội/độ khó
    TTL 30 ngày.
  - Model: gemini-2.5-flash, retry 1 lần lỗi 5xx/429, vẫn fail → backup gemini-2.5-flash-lite
    (đã gặp 503 thật trong lúc test → thêm tầng này).
  - Worker import FALLBACK_* + types từ ../src (DRY, wrangler tự bundle).
  - Đã test local với key thật: roast ai→cache ✓ (12 câu/loại, chất lượng ổn), trashtalk ai ✓,
    quiz ai ✓ (fact đúng — Lahm captain 2014), fallback ✓ (khi Gemini 503 thật),
    rate limit 30/phút ✓ (35 request → 4×429).

### 2.4. Client buffer ✅
- [x] api.ts: fetch batch đầu trận, buffer RAM theo content type
- [x] Lấy câu 0ms khi chơi card, refill ngầm khi buffer < 4 câu
- [x] Buffer riêng cho trash talk menu (bộ 3 câu)
- [x] Toàn bộ lỗi mạng → rơi về fallbackRoasts, game không bao giờ đứng
- Ghi chú (2026-06-12):
  - `src/api.ts` RoastBuffer: buffer 1 CHIỀU theo người nói → BattleScene tạo 2 instance
    (player→NPC và NPC→player), NPC cũng nói câu AI.
  - Kèm buffer quiz (1 câu prefetch) — quiz/trash talk chỉ prime phía player.
  - prime() không await — fallback gánh tới khi buffer về; gửi 8 câu gần nhất làm avoid list.
  - FETCH_TIMEOUT 25s (batch AI lạnh mất 15-20s; refill ngầm nên chờ được); refill tự hồi
    khi được gọi lại lúc low-water → mạng chết giữa trận vẫn tự phục hồi.
  - API_BASE: localhost → http://127.0.0.1:8787; deploy → cùng origin /api/*.
  - Test e2e (vite + worker + key thật): bubble hiện câu AI đúng ngữ cảnh 2 đội
    ("Mbappe's speed vs. your slow backline?"), chuyển mượt fallback→AI giữa trận,
    log refill cả 2 chiều.

**CHECKPOINT PHASE 2 (local): QTE + quiz + AI thật chạy trong game.
Còn lại cho deploy (Phase 5): KV namespace thật + wrangler secret + siết CORS.**

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
