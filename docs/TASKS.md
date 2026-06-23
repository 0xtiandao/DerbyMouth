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
  - ĐỔI PROVIDER (2026-06-12): Gemini → Virtuals Compute (free key cho agent). Route thực tế
    KHÁC docs của họ: POST /v1/chat/completions (OpenAI format) + header x-api-key, trả 201;
    /v1/messages (Anthropic format trong docs) trả 501; model id không có prefix "anthropic/"
    (list từ GET /v1/models). Primary claude-opus-4-7-fast, backup gemini-3-flash-preview.
    Batch lạnh ~20s → client FETCH_TIMEOUT nâng 35s. Test: roast/tt/quiz đều source ai,
    cache hit ✓, chất lượng tốt.
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

### 2.5. (extra, theo yêu cầu 2026-06-12) Cơ chế hồi máu ✅
- [x] Crowd Lifesteal: COUNTERED hút 30% final thành máu; combo x3 hồi flat 60;
      quiz NPC sai hồi 50 — heal gắn vào skill, áp cho CẢ 2 BÊN (NPC counter cũng hút máu)
- [x] Liquid Courage: nút bia cạnh nút switch — channel 2s hồi 135; đang uống không chơi
      card/Q-E; ăn đòn giữa chừng = SẶC (mất heal + dính thêm 20% đòn đó); cooldown 25s
      tính từ lúc bắt đầu uống (sặc vẫn mất lượt)
- Ghi chú:
  - `applyHeal` + lifesteal nằm trong `resolveCardPlay` (core, PVP sau dùng chung);
    `core/BeerChannel.ts` pure TS. 26 test mới (tổng 163).
  - Lifesteal tính theo final (trước shield) — thưởng cú đánh hay, không phạt vì shield.
  - PLAN.md mục 2 đã sửa (bỏ rule "không bên nào heal").
  - Test tay: sặc tự nhiên (-50 đòn → phạt -10 = 20% ✓, mất heal, mất lượt);
    uống trọn +130 (heal 135 cap vì chỉ thiếu 130 ✓) MF đầy lại; chặn card khi uống ✓.

## PHASE 3 — Polish PVE ✅ (2026-06-12)
- [x] Mark/debuff effects còn lại trong cards.ts (F1 slow regen, F2 shield, F4 cost+1, B2 buff next, P2 mark...)
- [x] NPC brain v2: ưu tiên counter content type player vừa đánh, switch style có logic
- [x] Reward screen + local stats (localStorage)
- Ghi chú — quyết định thiết kế:
  - Effects: F1 slowRegen (interval / (1-pct/100) trong InspirationSystem), F2 shield (buff bản
    thân, cộng vào state.shields có sẵn), F4 costUp (effectiveCost trong core — áp cả khi spend,
    hiển thị cost ĐỎ trên CardView, và NPC brain cũng bị), B2 buffNext (one-shot, gộp vào base
    giữ invariant breakdown, tiêu thụ trong resolveCardPlay), P2 mark (dùng marks có sẵn),
    P4 switchCooldownDown (trừ thẳng styleSwitchReadyAt), R2 revealNext (badge "👁 NEXT: <content>"
    cạnh NPC, biến mất khi NPC đánh).
  - NpcBrain v2: nhận enemy state; giữ "Ý ĐỊNH" card kế (chọn trước → R2 lộ được);
    70% ưu tiên card khắc content player vừa đánh (NPC_COUNTER_PICK_CHANCE);
    switch: đang khắc player thì GIỮ style, không thì 70% chọn style khắc player
    (NPC_SMART_SWITCH_CHANCE) — không 100% để NPC vẫn "người".
  - Reward screen: MATCH SUMMARY (dmg dealt / biggest hit / quiz stumped — track trong
    BattleScene, truyền qua ResultSceneData.summary) + lifetime stats localStorage
    (src/stats.ts, key derbymouth.stats.v1, W/L/streak/best) — Phase 4 chuyển D1.
  - Test: 179 pass (16 mới). Test tay: REGEN -30% / +3 INSP floats, reward screen 2 trận
    liên tiếp streak 1→2 🔥 persist đúng.

## PHASE 4 — Account + Wallet + PVP ✅ (2026-06-12, chain: EVM)
- [x] Profile: chọn đội (teams.ts), lưu D1; wallet auth (SIWS/SIWE) — CHỌN EVM (MetaMask, SIWE-lite)
- [x] PeerJS room code, sync action, quiz PVP có timer trả lời thật
- [x] Lock action theo nhịp ngắn chống desync — đổi cách tiếp cận, xem ghi chú
- Ghi chú 4.1 (profile + wallet):
  - Worker: /api/auth/nonce → personal_sign → /api/auth/verify (viem verifyMessage, nonce 1 lần,
    session token KV 7 ngày) → /api/profile GET/POST + /api/profile/result. D1 binding local
    (bảng profiles, schema lazy CREATE IF NOT EXISTS). User ID = wallet address từ ngày đầu.
  - Client: wallet.ts (chỉ sign, không transaction), profile.ts (localStorage cache + D1 sync),
    ProfileScene (grid 14 đội + connect wallet + stats on-record), guest mode giữ nguyên.
  - BattleScene dùng đội profile; ResultScene đẩy kết quả lên D1 khi có session.
  - E2E: ký thật bằng test key (shim window.ethereum) → verify → D1 lưu team VIE → battle
    hiện "Vietnam fan (you)". Deploy thật: `wrangler d1 create derbymouth` + thay database_id.
- Ghi chú 4.2 (PVP):
  - pvp/PvpLink.ts: PeerJS room code 5 chữ (id = derbymouth-<code>), hello (team) → style →
    act/mf/quizAsk/quizAns/bye. Singleton giữ link qua scene.
  - CHỐNG DESYNC: thay lockstep cứng bằng (1) bên ĐÁNH là nguồn sự thật cho damage — gửi
    final/counter/combo + snapshot MF sau đòn, bên nhận áp đúng số; (2) heartbeat MF mỗi 2s;
    (3) message xử lý theo thứ tự đến mỗi frame. Đơn giản hơn lockstep mà đủ chắc cho nhịp game.
  - QTE prompt TỰ hoạt động trong PVP (registerCardPlayed đối thủ nuôi counter window + prompt).
  - Quiz PVP: quizAsk → bên bị hỏi có QuizPanel.runAnswer (4 đáp án bấm thật + thanh
    QUIZ_ANSWER_TIME_MS, hết giờ = sai) → quizAns → 2 bên áp kết quả đối xứng.
  - Đối thủ thoát (bye/closed) → mình thắng. Trận xong link đóng (1 trận/1 kết nối).
  - JOIN nhập code qua window.prompt (placeholder — Phase 5 làm UI nhập chữ).
  - E2E 2 page thật qua PeerJS cloud: style sync ✓, đòn qua lại MF khớp từng số ✓ (fix bug
    đội hello ≠ đội battle khi chưa có profile), drain Inspiration sync ✓, QTE prompt nổ ✓.
  - CHƯA làm (để sau): Quick Match/matchmaking rivalry, betting điểm trash talk, reconnect.

## PHASE 5 — Art + Audio + Deploy (đang làm)
- [~] Thay placeholder bằng asset thật (docs/PLAN.md mục 6)
  - [x] Card art pipeline: chibi cartoon sinh bằng Grok, đặt trong `Assetgrok/<cardID>.{jpg,png}`.
        Vite glob (`src/data/cardArt.ts`) tự nhận file → BootScene load → CardView hiện art,
        card chưa có art tự fallback placeholder. CardView đổi tỉ lệ 2:3 khớp ảnh 768×1152.
        Đã cắm R1, R2 (test batch) — chạy ngon trong trận. THẢ THÊM <ID>.jpg LÀ TỰ HIỆN.
  - [ ] Còn 18 card art (R3-R5, F1-F5, B1-B5, P1-P5) — sinh tiếp bằng Grok cùng style, drop vào Assetgrok/.
  - [x] Pipeline avatar + background + style icon (code, 2026-06-23 — dev#2): `src/data/sceneArt.ts`
        glob CÙNG pattern cardArt.ts, 3 thư mục con của Assetgrok/ (kèm README hướng dẫn thả ảnh):
          • `Assetgrok/bg/*` → background quán bia (cover full màn, nhiều file = chọn theo seed cặp đội)
          • `Assetgrok/avatar/<teamID>.jpg` (+ `_default`) → AvatarView giữa màn (player trái, NPC giữa)
          • `Assetgrok/style/<style>.jpg` → icon đè StyleIndicator + picker switch + StyleSelectScene
        Tất cả CÓ fallback placeholder (circle màu đội + mã đội / nền tối / chấm màu style) → chưa thả
        ảnh vẫn chạy. THẢ ẢNH ĐÚNG TÊN LÀ TỰ HIỆN, không cần sửa code. Đã verify Edge headless: avatar
        ECU/ALG + bg fallback + style circle hiển thị đúng, không lỗi console.
  - [ ] Sinh ảnh thật (dev#1, Grok/FLUX chibi): `_default` avatar trước (phủ 48 đội), bg quán bia,
        4 style icon (rebuttal/filibuster/bluster/provocation) — drop vào Assetgrok/{avatar,bg,style}/.
- [x] SFX ✅ (2026-06-16): `src/audio.ts` — SoundManager tổng hợp âm bằng Web Audio API
      (procedural oscillator+noise+envelope, KHÔNG file asset, không phụ thuộc Phaser).
      18 SFX: click/cardPlay/hit/counter/combo2-3/heal/beerStart-Done/choke/silence/
      qtePrompt/quizWrong-Right/switchStyle/win/lose/knockout. Unlock trên gesture đầu
      (autoplay policy), nút mute 🔊/🔇 (Menu + Battle) lưu localStorage. Wire hết event
      chính trong BattleScene + ResultScene. Swap sang sound thật (CC0) sau chỉ đổi play().
- [ ] Deploy: wrangler login + KV namespace thật + `wrangler d1 create derbymouth` + `wrangler secret put AI_API_KEY`
      + siết CORS về origin Pages + đổi API_BASE client sang cùng origin + UI nhập room code PVP (thay window.prompt)
