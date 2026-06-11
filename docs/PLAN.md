# DerbyMouth — Build Plan (tích hợp cơ chế Gift of Gab / Where Winds Meet)

> Web game 1v1 roast bóng đá real-time, chạy trên browser, mobile-friendly.
> Cơ chế combat lấy từ **Gift of Gab (Where Winds Meet)**: style RPS + card + Inspiration + Rebuttal QTE + Mental Focus.
> **Tiền:** Toàn bộ dev/asset/host MIỄN PHÍ. Chỉ trả phí cho **API AI sinh roast**.

---

## 0. MÔ HÌNH CƠ CHẾ ĐÚNG (đọc kỹ — đây là phần quan trọng nhất)

Có **3 lớp** tách biệt, đừng nhầm lẫn:

### Lớp 1 — Style tính cách (RPS động, switch giữa trận)
4 style theo vòng counter:

```
   Rebuttal  →  Filibuster
      ↑              ↓
  Provocation ←   Bluster
```

**KHÔNG lock đầu trận nữa.** Cơ chế switch động:

- Đầu trận: chọn style khởi đầu.
- Trong trận: **mỗi 15 giây được chọn lại style 1 lần** (nút switch sáng lên khi cooldown xong, có hiệu ứng đếm ngược vòng tròn).
- **Mỗi lần switch style → các card rút SAU đó thuộc pool card của style mới.** Card đang cầm trên tay giữ nguyên.
- Style của cả 2 bên LUÔN hiển thị trên màn hình (ảnh 3) → đọc style đối thủ để switch counter nó.
- Style khắc đúng style đối thủ = toàn bộ damage được buff (vd +25%) trong lúc lợi thế còn giữ.

**Mind-game chính:** thấy đối thủ switch → mày có 15s "kẹt" style hiện tại trước khi được switch theo → phải dự đoán trước đối thủ sẽ đổi sang gì. PVP cực kỳ căng vì 2 bên cooldown riêng.

**Cân bằng cần test:** 15s là con số khởi điểm — nếu meta thành "switch liên tục vô não" thì tăng cooldown hoặc thêm cost Inspiration cho việc switch.

### Lớp 2 — Nội dung roast (CHẤT LIỆU, không phải hệ counter)
4 loại nội dung mà **AI dùng để sinh câu cãi**:

| Loại | Màu | Chất liệu |
|---|---|---|
| Rational | Blue | Số liệu, chiến thuật, giá chuyển nhượng |
| Emotional | Purple/Pink | Scandal, đời tư, meme |
| Intimidation | Red/Orange | Cúp, tiền, flex giàu |
| **Fan-Shaming** | Green/Yellow | **Công kích cá nhân đối thủ xoay quanh bóng đá**: nghi ngờ kiến thức ("fan đội đó mà có biết số 7 là ai không?"), tố fan nửa mùa / fan phong trào ("plastic fan", "glory hunter"), bóc mẽ chỉ xem highlight, mới theo đội từ lúc vô địch... |

**Quan trọng:** 4 loại này KHÔNG quyết định thắng lượt. Chúng chỉ quyết định *AI sinh câu roast theo phong cách nào*. Một card tag 1 trong 4 loại → AI sinh nội dung tương ứng.

**Fan-Shaming hoạt động được vì:** mỗi player đã khai báo đội mình ủng hộ lúc tạo tài khoản (xem mục Account) → AI biết chính xác đối thủ fan đội nào để công kích đúng chỗ: lịch sử đội, huyền thoại, số áo, mùa giải nhục nhã...

**Ranh giới nội dung:** công kích cá nhân CHỈ xoay quanh tư cách fan + kiến thức bóng đá. AI không sinh câu xúc phạm ngoài chủ đề bóng đá (ngoại hình, gia đình, chủng tộc, tôn giáo...) — vừa giữ vibe pub banter vui, vừa tránh game thành công cụ harassment.

### Lớp 2.5 — VÒNG KHẮC CHẾ NỘI DUNG (counter động giữa trận)

4 loại nội dung khắc chế nhau theo vòng:

```
Rational (Facts) ──khắc──> Intimidation (Flex)
     ↑                              │
     │                              ↓
Fan-Shaming <──khắc── Emotional (Drama)
```

Flavor logic:
- **Facts đập Flex:** "khoe cúp nhưng số liệu nói đội mày tệ"
- **Flex đè Drama:** "tiền và danh hiệu im mồm scandal"
- **Drama đâm Fan-Shaming:** "chê tao fan nửa mùa? đội mày đang dính phốt kìa"
- **Fan-Shaming khắc Facts:** "thuộc số liệu mà có phải fan thật đâu, stat nerd"

**Cách hoạt động:** đối thủ vừa đánh card loại X → mày đánh card loại khắc X trong **window 5 giây** = **COUNTER! +50% damage** + particle + screen shake riêng. Tạo mind-game đọc bài liên tục thay vì spam card mạnh nhất.

### Lớp 2.6 — COMBO CHAIN (đánh cùng loại liên tiếp)

Đánh 2-3 card **cùng loại nội dung** liên tiếp = combo:
- Card thứ 2 cùng loại: +25% dmg, hiện "COMBO x2"
- Card thứ 3 cùng loại: **x2 dmg**, AI sinh câu roast DÀI HƠN + GẮT HƠN cho cú chốt ("Stat Barrage finale")
- Bị đứt combo nếu: đánh card khác loại, hoặc bị silence

**Trade-off cốt lõi với counter (2.5):** giữ 1 loại để combo HAY đổi loại để counter đòn đối thủ? Đây là quyết định mỗi giây của player → chiều sâu chiến thuật mà không thêm UI phức tạp.

### Lớp 3 — Card + effect (cơ chế chơi)
Mỗi card có:
- **Thuộc pool của 1 style** (Rebuttal/Filibuster/Bluster/Provocation) — switch style thì card rút sau đó lấy từ pool style mới
- **Tag 1 loại nội dung** (Rational/Emotional/Intimidation/Fan-Shaming) — dùng cho counter triangle + combo + AI sinh câu
- **Inspiration cost** (góc trên trái, như ảnh 2/4: số 5, 4, 6, 3...)
- **Effect** (damage / silence / recover Inspiration / buff / debuff)
- **Nội dung roast do AI sinh full** (khác WWM — WWM dùng text cố định)

→ Card vừa có effect cố định (game-design), vừa có câu chữ động (AI). Khi mày chơi 1 card có skill → hiện menu chọn skill như ảnh 5 (3 lựa chọn effect khác nhau).

---

## 1. UI MÀN BATTLE (map trực tiếp từ ảnh WWM)

```
┌────────────────────────────────────────────────────────┐
│  [NPC Style icon] Tên NPC        Timer ⏱ 72            │ ← ảnh 4 góc phải
│  ▓▓▓▓▓▓▓▓▓▓░░ Mental Focus NPC (1062/1062)             │ ← thanh máu NPC trên đầu
│                                                          │
│         [Speech bubble NPC bên phải] ⚡                  │ ← ảnh 4: bong bóng phải + tia sét
│                                                          │
│              NHÂN VẬT NPC (giữa màn)                    │
│                                                          │
│  [Speech bubble player bên trái] ⚡                      │ ← ảnh 4: bong bóng trái (xanh lá)
│  [Style icon] Player Style                              │
│  ▓▓▓▓▓▓░░░░ Mental Focus Player                        │ ← thanh máu mày
│                                                          │
│  ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐         ◯ Inspiration       │ ← hand 3-5 card + bubble số
│  │5 │ │4 │ │6 │ │3 │ │4 │         (6) ← ảnh 4 góc phải │
│  └──┘ └──┘ └──┘ └──┘ └──┘                              │
└────────────────────────────────────────────────────────┘
```

**Các thành phần (đối chiếu ảnh):**

| UI | Ảnh | Mô tả |
|---|---|---|
| Style counter wheel | Ảnh 1 | Màn chọn style đầu trận, 4 icon vòng tròn |
| Style 2 bên | Ảnh 3 | Tên + icon style của cả 2 nhân vật |
| Hand card | Ảnh 2, 4 | 3-5 lá, mỗi lá có cost + icon effect |
| Speech bubble 2 bên | Ảnh 4 | Câu cãi hiện 2 bên màn hình (trái = mày, phải = NPC) |
| Mental Focus bar | Ảnh 2, 4 | Máu, không heal được, về 0 = thua |
| Timer | Ảnh 4 | Đếm ngược, hết = sudden death drain MF cả 2 |
| Inspiration bubble | Ảnh 1 (mô tả) | Bong bóng số + vòng regen quanh nó |
| Skill selection menu | Ảnh 5 | Khi chơi card có skill → 3 lựa chọn effect (text AI sinh) |
| Trash Talk prompt | Ảnh 4 + Q | Bubble flash + silhouette + phím Q/E (tùy trái/phải hoặc gần MF) |

---

## 2. CORE LOOP REAL-TIME (từng giây)

Trận đấu real-time, KHÔNG strict turn-based — ai nhanh tay lợi thế.

```
0. Đầu trận: chọn style KHỞI ĐẦU (ảnh 1) → vào arena
   (không lock — switch lại được mỗi 15s trong trận)

--- vòng lặp real-time ---

1. NPC nói → speech bubble (phải) hiện, animation miệng

2. PLAYER CHƠI THẺ:
   a. Liếc Inspiration bubble → còn đủ điểm không?
   b. Tap 1 lá từ hand → tốn Inspiration theo cost
   c. AI sinh câu roast cho card → pop speech bubble (trái) + particle
   d. Damage + effect ngay vào MF NPC
      + COUNTER CHECK: card mày khắc loại card đối thủ vừa đánh
        (trong window 5s) → +50% dmg "COUNTERED!"
      + COMBO CHECK: cùng loại với card trước → x2 = +25%, x3 = x2 dmg
        (câu chốt combo AI sinh dài + gắt hơn)
   (Nếu card có skill riêng → menu chọn effect như ảnh 5)

2.5. STYLE SWITCH (mỗi 15s): nút switch sáng → đổi style mới
   → card rút SAU đó thuộc pool style mới (card trên tay giữ nguyên)
   → style khắc style đối thủ = buff toàn bộ dmg +25%

3. NPC PHẢN ĐÒN tự động → trừ MF Player

4. TRASH TALK / REBUTTAL PROMPT (random lúc NPC đang nói):
   - Bubble NPC flash + hiện icon silhouette + phím Q HOẶC E
     (tùy bên trái/phải, hoặc gần thanh MF — không chỉ E)
   - Timer ngầm NGẮN → phải nhấn Q/E NGAY trước khi hết giờ
   - Nhấn đúng → mở Trash Talk Menu (bước 5)
   - Bỏ lỡ → mất cơ hội, NPC nói tiếp

5. TRASH TALK MENU — LUÔN đúng 3 option, text do AI sinh (thay đổi mỗi lần):
   Mỗi option thuộc 1 trong 2 DẠNG:

   DẠNG A — PHẢN BÁC (counter câu NPC vừa chửi):
   - Option 1 (thường): Damage CỰC MẠNH (pure DPS, ~150%)
   - Option 2 (thường): Damage trung (~40%) + recover Inspiration
   - Option 3 (thường): Damage trung (~40%) + silence/sabotage NPC

   DẠNG B — QUIZ (đặt câu hỏi kiến thức về ĐỘI ĐỐI THỦ đang ủng hộ):
   - AI sinh câu quiz dựa trên đội của đối thủ
     (vd: "Fan cứng hả? Thế ai ghi bàn chung kết 2014?")
   - PVE: NPC có % trả lời đúng theo độ khó
   - PVP: đối thủ THẬT phải trả lời trong vài giây
     → Trả lời SAI/hết giờ: dính damage LỚN + bị mark "fan nửa mùa" (debuff/badge nhục)
     → Trả lời ĐÚNG: phản damage ngược lại người hỏi
   - Quiz = risk/reward: damage tiềm năng cao nhất nhưng có thể bị phản đòn

   - TẤT CẢ option miễn phí 100% Inspiration, không tốn turn
   - Chọn → effect ngay + NPC animation bối rối

6. LOOP: hand refresh → Inspiration regen (vòng tròn) → NPC nói tiếp
   → chờ prompt Q/E lần sau

--- kết thúc khi 1 bên MF = 0 ---
```

**Heal MF tồn tại nhưng là PHẦN THƯỞNG cho skill/risk, không phải nút spam** (update 2026-06-12 — bỏ rule "không heal" kế thừa WWM, có chống turtle meta):
1. **Crowd Lifesteal** — roast hay = khán giả cười = hồi tinh thần: COUNTERED hút 30% dmg
   gây ra thành máu; combo x3 finisher hồi flat 60; đối thủ quiz sai hồi 50.
2. **Liquid Courage** — nút uống bia: channel 2s → hồi 135. Trong lúc uống không chơi card,
   không Q/E; bị trúng đòn = SẶC: mất heal + dính thêm 20% đòn đó; cooldown 25s tính từ lúc
   bắt đầu uống (sặc vẫn mất lượt). Mind-game mới: "nó sắp uống kìa, đập ngay!"

Ai về 0 trước thua.

---

## 2.5. ACCOUNT, ĐỘI BÓNG & WEB3 PROFILE

### Tạo tài khoản + chọn đội (bắt buộc)
- Khi tạo profile, player **PHẢI chọn đội bóng mình ủng hộ** (World Cup 2026: chọn tuyển quốc gia; sau này mở rộng CLB).
- Đội đã chọn dùng cho:
  1. **AI Fan-Shaming**: đối thủ/NPC roast đúng đội mày fan (lịch sử nhục, huyền thoại, số áo...)
  2. **Quiz mechanic**: câu hỏi quiz sinh theo đúng đội của người bị hỏi
  3. Matchmaking PVP theo rivalry (fan 2 đội kình địch gặp nhau = derby thật)
  4. Badge/avatar theo màu đội
- Cho đổi đội nhưng có cooldown (vd 7 ngày) + bị gắn badge "Glory Hunter" tạm thời nếu đổi sang đội đang mạnh 😏 (đúng tinh thần game)

### Web3 wallet profile (chuẩn bị cho token sau này)
- **Đăng nhập bằng ví web3** (connect wallet) thay vì email/password truyền thống:
  - Solana: Phantom (sign message để auth — chuẩn SIWS)
  - Hoặc EVM: MetaMask (SIWE - Sign In With Ethereum)
  - → Mày đã có kinh nghiệm cả 2 chain, chọn chain theo kế hoạch token
- Profile lưu: wallet address (= user ID), đội bóng, stats (W/L, streak), badges
- **Cơ chế token: TÍNH SAU** — nhưng kiến trúc chuẩn bị sẵn:
  - User ID = wallet address ngay từ đầu → sau này airdrop/reward token KHÔNG cần migrate dữ liệu
  - Stats on-record (số trận thắng, quiz đúng...) → làm căn cứ airdrop cho early player
- Lưu profile ở đâu (free): Cloudflare KV hoặc D1 (SQLite, free tier) — D1 hợp hơn vì cần query stats/leaderboard
- **Cho phép chơi guest không cần ví** (thử game ngay) nhưng không lưu stats → đẩy người chơi connect wallet

---

### Snowball mechanic — Scholar card tăng tần suất prompt
Một số card (nhánh Scholar) có effect **"tăng tần suất Trash Talk/Rebuttal prompt"**.
→ Càng nhiều Q/E xuất hiện → càng nhiều free damage → win càng dễ.
Đây là **trục build chính**: player nào ưu tiên card tăng prompt frequency sẽ snowball.

**Lưu ý design:** vì prompt là free damage rất mạnh, phải cân bằng:
- Base frequency vừa phải (không spam liên tục từ đầu)
- Card tăng frequency có cost/trade-off (vd cost Inspiration cao, hoặc damage card thấp)
- Window nhấn Q/E đủ ngắn để vẫn cần kỹ năng, không phải free 100%

---

## 3. AI SINH ROAST — KIẾN TRÚC (full động)

Vì mày chọn AI sinh full nội dung mỗi card, đây là phần phức tạp nhất.

### Vấn đề real-time + AI latency
Real-time mà chờ AI sinh từng câu thì lag. Giải pháp **pre-generate + buffer**:

```
- Khi vào trận, Worker pre-generate sẵn 1 BATCH 10-15 câu roast
  cho mỗi loại (Rational/Emotional/Intimidation) × style hiện tại
- Game giữ buffer trong RAM
- Mỗi lần chơi card → lấy câu từ buffer NGAY (0ms, không chờ AI)
- Background: Worker refill buffer khi gần cạn
- TRASH TALK MENU: vì text 3 option thay đổi mỗi lần + cần hiện
  TỨC THÌ khi nhấn Q/E, phải có buffer RIÊNG cho trash talk.
  Pre-generate sẵn vài bộ "3 câu" (1 mạnh / 1 recover / 1 silence)
  → khi player nhấn Q/E, lấy 1 bộ ra ngay, không chờ AI
```

→ Người chơi không bao giờ thấy loading giữa trận. AI chạy ngầm refill.

### Worker endpoints
- `/api/roast/batch` — sinh 10-15 câu/loại, gọi lúc đầu trận + refill
  - Input: style 2 bên, **đội của mày + đội của đối thủ**, loại nội dung (4 loại), history 8 câu
- `/api/trashtalk/batch` — sinh sẵn các bộ "3 option" cho Trash Talk menu (phản bác + quiz)
- `/api/quiz` — sinh câu quiz về đội cụ thể + đáp án đúng + 3 đáp án nhiễu
  - Quiz cần đáp án CHÍNH XÁC → prompt yêu cầu AI chỉ hỏi facts nổi tiếng, dễ verify
  - Pre-generate pool quiz theo đội, cache KV lâu dài (facts lịch sử không đổi)

### Master prompt (chạy trong Worker)
```
You are a savage international pub roast master for World Cup 2026 banter.
Style: max 20 words, punchy, Discord-roast vibe ("bro really...", "nah fr", "mf", "broke ass").
Content type:
- Rational = stats/tactics/transfer fees
- Emotional = drama/memes
- Intimidation = trophies/money/flex
- FanShaming = attack the OPPONENT AS A FAN: question their knowledge
  ("do you even know who wears #7?"), call them plastic fan / glory hunter /
  highlight-only watcher, mock when they started supporting
My team: [team A]. Opponent's team: [team B] — use team B's real history,
legends, embarrassing seasons for FanShaming.
Avoid these recent lines: [last 8].
BOUNDARIES: all personal attacks must stay football-related (fan credibility,
team knowledge). NEVER attack appearance, family, race, religion, or anything
outside football. Roast teams and fan culture, not private lives of real people.
Output ONLY a JSON array of 12 fresh roast strings. No preamble.
```

### Quiz prompt (riêng)
```
Generate 1 football trivia question about [team B] for World Cup 2026 pub quiz.
Difficulty: [easy/medium/hard]. Must be a well-known verifiable fact
(famous goals, legendary players, shirt numbers, historic results).
Output JSON: {"q": "...", "correct": "...", "wrong": ["...","...","..."]}
```

### Kiểm soát chi phí
- Batch generation (12 câu/call) → ít call hơn nhiều so với 1 câu/call
- Cache KV theo (style + content type + target)
- Pre-generate offline 1 pool lớn làm fallback (cũng dùng làm placeholder Phase 1)
- Rate limit per-IP ở Worker
- Model rẻ: Gemini 2.5 Flash

---

## 4. STACK KỸ THUẬT (miễn phí, trừ AI)

| Hạng mục | Tool | Free? |
|---|---|---|
| Engine | Phaser 3 + TypeScript + Vite | ✅ |
| Backend proxy | Cloudflare Workers | ✅ 100k req/ngày |
| AI buffer cache | Cloudflare KV | ✅ |
| PVP | PeerJS (P2P) | ✅ |
| Host | Cloudflare Pages | ✅ |
| Art | Recraft / Sprite AI / Photopea / Piskel | ✅ |
| SFX | Freesound / Pixabay (CC0) | ✅ |
| **AI roast** | Gemini 2.5 Flash | 💲 trả phí |

---

## 5. ROADMAP (8-10 tuần, dài hơn plan v1 vì cơ chế phức tạp hơn)

### PHASE 0 — Validate AI + thiết kế card (4-5 ngày)
- [ ] Test master prompt: sinh batch 12 câu/loại (cả Fan-Shaming), chấm tay chất lượng
- [ ] Test quiz prompt: sinh 20 quiz cho 2-3 đội, VERIFY đáp án đúng bằng tay
- [ ] Thiết kế bộ card cơ bản (10-15 lá): tên, cost, effect, content type (4 loại)
- [ ] Thiết kế 4 style + vòng RPS + bonus damage khi counter đúng
- [ ] Chốt model AI + chốt chain cho wallet auth (Solana/EVM theo kế hoạch token)

### PHASE 1 — Combat skeleton, roast hardcode (2.5 tuần)
Dùng pool roast pre-generate offline, chưa cắm AI live.
- [ ] Style selection screen (ảnh 1): 4 icon, chọn style khởi đầu
- [ ] **Style switch system: cooldown 15s, nút sáng + vòng đếm ngược, đổi pool card rút sau**
- [ ] **Style counter buff: khắc style đối thủ = +25% toàn bộ dmg**
- [ ] Battle arena UI: MF bar 2 bên, timer, hand card, Inspiration bubble, style indicator 2 bên
- [ ] Inspiration system: số + regen vòng tròn theo thời gian
- [ ] Card system: hand 3-5 lá, cost, play → effect, refresh; card thuộc pool style + tag loại nội dung
- [ ] **Counter triangle: đánh card khắc loại card đối thủ trong window 5s = +50% dmg "COUNTERED!"**
- [ ] **Combo chain: cùng loại x2 = +25%, x3 = x2 dmg + câu chốt gắt hơn**
- [ ] Skill selection menu (ảnh 5): card có skill → 3 lựa chọn effect
- [ ] Speech bubble 2 bên (ảnh 4): câu roast pop lên + particle
- [ ] Real-time loop (NPC nói liên tục, player chơi card bất kỳ lúc nào)
- [ ] MF damage, win/lose khi về 0

### PHASE 2 — Trash Talk QTE + Quiz + cắm AI thật (2.5 tuần)
- [ ] Trash Talk trigger random: bubble NPC flash → silhouette + phím Q/E
      (Q hoặc E tùy bên trái/phải hoặc gần thanh MF)
- [ ] QTE timer ngầm ngắn, nhấn Q/E → Trash Talk menu 3 câu (text AI sinh động)
- [ ] Quiz mechanic trong menu: câu hỏi về đội đối thủ, PVE = NPC % trả lời đúng
- [ ] Cloudflare Worker: batch roast + trash talk + quiz endpoints, buffer + KV cache
- [ ] Buffer RIÊNG cho trash talk (bộ "3 câu") sẵn sàng tức thì
- [ ] Quiz pool pre-generate theo đội, cache KV dài hạn
- [ ] Tích hợp buffer vào game (lấy câu 0ms, refill ngầm)
- [ ] Scholar card "tăng tần suất prompt" → snowball mechanic
- [ ] NPC AI: chọn style + chơi card "thông minh" (Mood logic)
- [ ] Fallback hardcode khi API lỗi

### PHASE 3 — Sudden death, timer mechanics, polish PVE (1.5 tuần)
- [ ] Timer hết → sudden death drain MF cả 2
- [ ] Silence effect (NPC im 1-2s, mày spam card)
- [ ] Buff/debuff effects
- [ ] Style counter bonus damage rõ ràng
- [ ] Reward screen: EXP, progress

### PHASE 4 — Account + Wallet + PVP (2.5 tuần)
- [ ] Profile system: chọn đội bóng (bắt buộc), lưu Cloudflare D1
- [ ] Wallet auth: connect Phantom (SIWS) hoặc MetaMask (SIWE) — sign message, không cần transaction
- [ ] Guest mode (chơi thử không ví, không lưu stats)
- [ ] Stats: W/L, streak, quiz đúng/sai → căn cứ airdrop sau này
- [ ] PeerJS: Room Code + Quick Match
- [ ] Matchmaking theo rivalry (fan 2 đội kình địch ưu tiên gặp nhau)
- [ ] Đồng bộ style của cả 2 (ảnh 3: hiện style 2 bên)
- [ ] Real-time sync action qua data channel
- [ ] Quiz PVP: đối thủ thật trả lời trong giới hạn giây, sai = damage lớn + badge "fan nửa mùa"
- [ ] Trash Talk realtime, betting điểm
- [ ] **Lưu ý PVP:** real-time P2P khó sync. Timer chung + lock action mỗi nhịp ngắn để tránh desync.

### PHASE 5 — Art + Audio + Deploy (1 tuần)
- [ ] Thay placeholder bằng art thật
- [ ] SFX: đập bàn, cốc va, "BANG!", còi VAR, tiếng cười
- [ ] Card art (như ảnh 2/4: nhân vật biểu cảm trên mỗi lá)
- [ ] Deploy Cloudflare Pages + Worker
- [ ] Beta test mobile

---

## 6. TẠO ASSET — TỪNG BƯỚC (toàn bộ FREE)

### 6.1. Card art (quan trọng nhất, ảnh 2/4)
Mỗi card có 1 nhân vật biểu cảm (Good For You = mặt vui, Wronged = mặt tủi...).
1. Recraft / Grok Imagine, prompt:
   > "2D cartoon chibi football fan, exaggerated facial expression [happy/sad/confused/cocky], simple flat colors, playing card illustration, transparent background"
2. Sinh 10-15 biểu cảm khác nhau (1 cho mỗi card).
3. Photopea: crop, xóa nền, gắn vào khung card (vẽ khung 1 lần dùng chung).
4. Lưu `public/assets/cards/`.

### 6.2. Style icon (ảnh 1, 4 icon vòng tròn)
1. Vẽ 4 icon đơn giản (Rebuttal/Filibuster/Bluster/Provocation) bằng Canva hoặc SVG tay.
2. Mỗi style 1 màu riêng để dễ phân biệt.

### 6.3. Nhân vật chính giữa màn (ảnh 4)
1. Recraft sinh 2 avatar nhân vật, side/front view.
2. Sprite AI animate: idle, taunt, hurt, defeat (4 anim đủ cho MVP).
3. Ghép sprite sheet ở Photopea, ghi frame size.

### 6.4. Background quán bia
1. Recraft: "2D cartoon sports bar, warm lighting, World Cup banners, 16:9".
2. Crop ở Photopea.

### 6.5. Speech bubble + particle + Inspiration bubble
- Speech bubble: vẽ SVG/Canva, hoặc Phaser graphics (rounded rect + tail).
- Inspiration bubble + vòng regen: Phaser Arc/Graphics, animate vòng tròn.
- Particle: Phaser built-in, không cần asset.

### 6.6. Audio (free)
- Freesound/Pixabay CC0: đập bàn, cốc va, còi VAR, tiếng cười, "ding" khi silence.

---

## 7. KHÁC BIỆT SO VỚI PLAN V1

1. **Bỏ turn-based 7 giây** → real-time như WWM. Phức tạp hơn nhưng đúng cảm giác mày muốn.
2. **Thêm lớp style RPS** (4 style) tách khỏi nội dung roast (3 loại). Trước đây tao nhầm 3 cái này là hệ counter.
3. **Thêm Inspiration system** (mana + regen vòng tròn).
4. **Thêm Rebuttal QTE** (nhấn E + menu 3 lựa chọn) — điểm nhấn gameplay.
5. **Card có effect cố định + nội dung AI động** (hybrid).
6. **AI dùng buffer pre-generate** thay vì gọi live mỗi câu (vì real-time cần latency 0).
7. Roadmap dài hơn: 8-10 tuần thay vì 6-8.

---

## 8. RỦI RO MỚI CẦN LƯU Ý

| Rủi ro | Giải pháp |
|---|---|
| Real-time + AI latency = lag | Buffer pre-generate, lấy câu 0ms, refill ngầm |
| PVP real-time desync | Timer chung + lock action mỗi nhịp ngắn, hoặc semi-turn |
| Chi phí AI tăng (batch lớn) | Cache KV + rate limit + pool fallback offline |
| Cơ chế phức tạp dễ rối | Phase 1 làm skeleton với roast hardcode trước, tách AI ra Phase 2 |
| Card art nhiều (10-15 lá) | Tái dùng 1 khung, chỉ đổi biểu cảm nhân vật |

---

## 9. VIỆC TIẾP THEO NGAY

1. Phase 0: thiết kế bộ 10-15 card (tên + cost + effect + content type) — tao có thể viết bảng này cho mày.
2. Test master prompt batch generation.
3. `npm create vite` + Phaser → dựng skeleton.
4. Build style selection (ảnh 1) + battle UI trước.
