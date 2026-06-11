# DerbyMouth — Card Design v1 (20 lá + công thức damage)

> Mỗi card có 4 thuộc tính: **Style pool** × **Content type** × **Cost** × **Effect**.
> Câu chữ trên card do AI sinh theo content type — tên card chỉ là "khung effect".

---

## 0. THÔNG SỐ NỀN (baseline để cân bằng)

| Thông số | Giá trị khởi điểm |
|---|---|
| Mental Focus (máu) | 1000 mỗi bên |
| Inspiration tối đa | 10 |
| Inspiration regen | +1 mỗi 2 giây |
| Hand size | 4 lá (rút lá mới khi dùng) |
| Style switch cooldown | 15s |
| Counter window (content) | 5s sau khi đối thủ đánh card |
| Trash Talk prompt base | ~12% chance mỗi 5s NPC nói |

### Công thức damage

```
finalDmg = baseDmg
         × styleBuff      (1.25 nếu style mày khắc style đối thủ)
         × contentCounter (1.5 nếu đánh trong counter window đúng loại khắc)
         × comboMult      (1.25 nếu combo x2 | 2.0 nếu combo x3)
         × markBonus      (1.1 nếu đối thủ đang dính mark)
```

**Trần lý thuyết:** 1.25 × 1.5 × 2.0 × 1.1 = **~4.1x** — chỉ đạt được khi setup hoàn hảo.
Một đòn 150 base × 4.1 = ~615 dmg (60% máu). Hiếm nhưng phải ĐÃ — đây là "Pub Knockout moment".
Nếu test thấy quá mạnh: nerf comboMult x3 xuống 1.75 trước, đừng đụng counter (counter là skill).

---

## 1. REBUTTAL POOL (phản bác — reactive, thưởng cho đọc bài)

| # | Card | Cost | Content | Base dmg | Effect |
|---|---|---|---|---|---|
| R1 | Source?! | 2 | Rational | 60 | +30 dmg nếu đòn này trigger COUNTERED (thưởng counter play) |
| R2 | Fact Check | 4 | Rational | 80 | Lộ content type của card tiếp theo đối thủ định đánh (PVE: lộ ý định NPC) |
| R3 | Receipts Pulled | 5 | Emotional | 90 | Silence đối thủ 1.5s |
| R4 | Name One Player | 3 | Fan-Shaming | 70 | Đối thủ -1 Inspiration |
| R5 | Stat Slam | 6 | Rational | 150 | Finisher thuần damage |

**Identity:** Rebuttal mạnh nhất khi phản ứng — R1+R2 tạo loop đọc bài → counter.

## 2. FILIBUSTER POOL (câu giờ — drain/stall)

| # | Card | Cost | Content | Base dmg | Effect |
|---|---|---|---|---|---|
| F1 | Yap Storm | 3 | Emotional | 50 | Đối thủ regen Inspiration chậm 30% trong 5s |
| F2 | Wall of Text | 4 | Rational | 60 | Shield: chặn 50 dmg của đòn kế tiếp nhận vào |
| F3 | Whataboutism | 2 | Emotional | 40 | Recover 1 Inspiration |
| F4 | History Lesson | 5 | Fan-Shaming | 100 | Card của đối thủ cost +1 trong 8s |
| F5 | Beer Break | 3 | Intimidation | 0 | Recover 3 Inspiration (utility thuần) |

**Identity:** Filibuster thắng trận dài — bóp tài nguyên đối thủ, sống lâu hơn.

## 3. BLUSTER POOL (flex — big damage)

| # | Card | Cost | Content | Base dmg | Effect |
|---|---|---|---|---|---|
| B1 | Trophy Cabinet | 5 | Intimidation | 130 | Thuần damage |
| B2 | Net Spend Flex | 4 | Intimidation | 90 | Card kế tiếp của mày +20% dmg |
| B3 | Ratio'd | 3 | Emotional | 70 | x2 dmg nếu là card CHỐT combo x3 |
| B4 | Champions Anthem | 6 | Intimidation | 160 | Signature: screen shake to, particle vàng |
| B5 | Scoreboard | 2 | Rational | 50 | Rẻ — combo filler |

**Identity:** Bluster = burst. B5→B2→B4 là chuỗi burn chuẩn (cost 12, cần quản lý Inspiration).

## 4. PROVOCATION POOL (khiêu khích — bait/Scholar)

| # | Card | Cost | Content | Base dmg | Effect |
|---|---|---|---|---|---|
| P1 | Touch Grass 🎓 | 2 | Fan-Shaming | 45 | +15% chance Trash Talk prompt trong 10s |
| P2 | Plastic Fan Alert | 4 | Fan-Shaming | 85 | Mark đối thủ: +10% dmg nhận vào trong 6s |
| P3 | Crying Jordan 🎓 | 3 | Emotional | 65 | NPC mood → Anger (dễ trigger prompt hơn) |
| P4 | Bait & Switch | 4 | Intimidation | 75 | Cooldown switch style của MÀY -5s lần tới |
| P5 | Pub Quiz Challenge | 5 | Fan-Shaming | 60 | Force mini-quiz ngay: đối thủ sai = +80 dmg bonus |

🎓 = **Scholar card** (trục snowball tăng tần suất prompt — đúng update của mày).

**Identity:** Provocation không tự gây dmg to — nó tạo CƠ HỘI (prompt, mark, quiz) rồi cash-out.

---

## 5. PHÂN BỔ KIỂM TRA CÂN BẰNG

**Content type spread (đủ chơi counter triangle ở mọi style):**

| | Rational | Emotional | Intimidation | Fan-Shaming |
|---|---|---|---|---|
| Rebuttal | 3 | 1 | 0 | 1 |
| Filibuster | 1 | 2 | 1 | 1 |
| Bluster | 1 | 1 | 3 | 0 |
| Provocation | 0 | 1 | 1 | 3 |

→ Mỗi style nghiêng về 1 content type (Rebuttal=Rational, Bluster=Intimidation, Provocation=Fan-Shaming, Filibuster=Emotional) tạo identity, nhưng vẫn có lá khác loại để counter/combo linh hoạt.

**Cost curve:** 2 (4 lá) · 3 (5 lá) · 4 (5 lá) · 5 (4 lá) · 6 (2 lá) — đủ lá rẻ để luôn có gì đó chơi, lá 6 là moment lớn.

---

## 6. AI SINH CÂU THEO CARD — VÍ DỤ MAPPING

Khi player đánh card, game gửi cho Worker: `{cardName, contentType, myTeam, oppTeam, comboState}`.
AI sinh câu theo content type + flavor tên card. Ví dụ:

- **Name One Player** (Fan-Shaming): "name 3 [oppTeam] players before 2020, I'll wait... thought so, plastic."
- **Trophy Cabinet** (Intimidation): "we need a separate room for trophies, you need a separate excuse every season."
- **Whataboutism** (Emotional): "ok but what about YOUR keeper crying on live TV lmaooo"
- **Combo x3 finale**: AI nhận `comboState: 3` → sinh câu dài hơn, cấu trúc "setup → twist → knockout".

---

## 7. VIỆC TIẾP THEO

1. Code bảng này thành `cards.ts` (data-driven, chỉnh số không cần sửa logic).
2. Phase 1: test với roast hardcode, tune 3 con số trước tiên:
   - comboMult x3 (2.0 có vỡ trận không?)
   - counter window 5s (quá dễ hay quá khó bấm kịp?)
   - switch cooldown 15s (meta có thành spam switch không?)
3. Sau MVP: thêm rarity + card chữ ký theo đội (Samba Flow, It's Coming Home...).
