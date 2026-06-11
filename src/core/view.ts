// src/core/view.ts — kích thước thiết kế + chống mờ (supersample).
// Mọi scene đặt toạ độ theo VIEW (1280x720), KHÔNG dùng this.scale.width/height
// vì framebuffer thật to gấp RENDER_SCALE lần (camera zoom bù lại).

export const VIEW = { W: 1280, H: 720 } as const;

// Canvas nội bộ vẽ ở 2x rồi FIT thu/phóng theo cửa sổ → chữ và hình nét
// kể cả khi cửa sổ to hơn 1280x720. Nếu mobile yếu bị lag, hạ xuống
// Math.min(window.devicePixelRatio, 2).
export const RENDER_SCALE = 2;

// Resolution cho Text (texture chữ raster ở 2x) — khớp RENDER_SCALE.
export const TEXT_RESOLUTION = 2;
