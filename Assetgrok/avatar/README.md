# Avatar nhân vật theo đội (Phase 5)

Avatar fan chibi hiển thị giữa màn (player bên trái, NPC giữa). `src/data/sceneArt.ts` glob
tự nhận, BootScene load, `AvatarView` hiển thị. KHÔNG cần sửa code.

- Định dạng: `.jpg` / `.jpeg` / `.png`
- **Tên file = mã đội** (cột `id` trong `src/data/teams.ts`): `USA.jpg`, `ARG.png`, `BRA.jpg`...
- `_default.jpg` = avatar dùng chung cho mọi đội CHƯA có file riêng (fallback)
- Chưa có cả `_default` → game tự dùng circle màu đội + mã đội (placeholder)
- Tỉ lệ khuyến nghị 2:3 chân dung (vd 768×1152) — fit theo chiều cao, giữ nguyên tỉ lệ.
- Prompt gợi ý: *"2D cartoon chibi football fan in <team> kit, confident expression,
  thick outline, flat colors, transparent or simple background, full body"*

Ưu tiên làm `_default.jpg` trước (1 file phủ hết 48 đội), rồi bổ sung đội phổ biến (USA/ARG/BRA/ENG/FRA/GER...).
