# Background quán bia (Phase 5)

Thả ảnh nền quán bia vào đây — Vite glob (`src/data/sceneArt.ts`) tự nhận, BootScene load,
BattleScene hiển thị (cover full màn 1280×720, phần thừa bị cắt). KHÔNG cần sửa code.

- Định dạng: `.jpg` / `.jpeg` / `.png`
- Tên file tuỳ ý (vd `pub.jpg`, `derby-night.jpg`)
- Nhiều file = mỗi trận chọn 1 theo seed (cặp đội) → tự đa dạng
- Tỉ lệ khuyến nghị 16:9 (vd 1920×1080). Tông tối/ấm để chữ UI sáng đè lên đọc được.
- Prompt gợi ý (Grok/FLUX): *"2D cartoon sports bar interior, warm dim lighting,
  World Cup banners, TV screens, wooden tables, 16:9, no people in foreground"*

Chưa có file nào → game tự dùng nền tối mặc định (không vỡ).
