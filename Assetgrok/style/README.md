# Icon 4 style (Phase 5)

Icon cho 4 style hiển thị ở StyleIndicator (2 bên), picker nút switch, và màn chọn style.
`src/data/sceneArt.ts` glob tự nhận, BootScene load. KHÔNG cần sửa code.

- Định dạng: `.jpg` / `.jpeg` / `.png` (PNG nền trong đẹp nhất vì đè lên chấm màu)
- **Tên file = tên style** (đúng 4 file): `rebuttal`, `filibuster`, `bluster`, `provocation`
- Tỉ lệ vuông (vд 256×256) — fit "contain" vào ô tròn, giữ tỉ lệ không méo.
- Mỗi style 1 màu chủ đạo để khớp `STYLE_COLORS` trong `core/constants.ts`:
  - rebuttal = light blue · filibuster = violet · bluster = amber · provocation = emerald
- Ý tưởng icon: rebuttal (khiên/dấu hỏi phản bác), filibuster (đồng hồ/loa nói nhiều),
  bluster (cúp/kim cương flex), provocation (mặt cười đểu/mồi câu).

Chưa có file → game tự dùng chấm màu + chữ tên style (placeholder).
