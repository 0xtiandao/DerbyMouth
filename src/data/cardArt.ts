/// <reference types="vite/client" />
// src/data/cardArt.ts — card art (chibi cartoon, sinh bằng Grok) trong Assetgrok/.
// Quy ước: tên file = card ID (vd Assetgrok/R1.jpg cho card R1). Thả thêm file vào
// thư mục là tự nhận, KHÔNG cần sửa code. Vite glob bundle + hash url khi build.
const mods = import.meta.glob('/Assetgrok/*.{jpg,jpeg,png}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

/** { 'R1': '/assets/R1-hash.jpg', ... } — chỉ những card đã có art. */
export const CARD_ART: Record<string, string> = {};
for (const [path, url] of Object.entries(mods)) {
  const file = path.split('/').pop() ?? '';
  const id = file.replace(/\.(jpg|jpeg|png)$/i, '');
  CARD_ART[id] = url;
}

/** Phaser texture key cho card art. */
export const cardArtKey = (id: string): string => `card-${id}`;
