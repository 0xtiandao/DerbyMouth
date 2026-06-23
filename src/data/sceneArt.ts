/// <reference types="vite/client" />
// src/data/sceneArt.ts — asset cảnh ngoài card (Phase 5): background quán bia,
// avatar nhân vật theo đội, icon 4 style. CÙNG pattern với cardArt.ts:
// thả file đúng thư mục là Vite glob tự nhận, KHÔNG cần sửa code; chưa có file thì
// game tự dùng placeholder graphics (circle/màu). Art direction: chibi cartoon (Grok).
//
// Quy ước thư mục (con của Assetgrok/ → không đụng glob card art `/Assetgrok/*`):
//   Assetgrok/bg/*.{jpg,png}            → background quán bia (nhiều file = chọn 1)
//   Assetgrok/avatar/<teamID>.{jpg,png} → avatar fan theo đội (vd USA.jpg, ARG.png)
//   Assetgrok/avatar/_default.{jpg,png} → avatar dùng chung khi đội chưa có art riêng
//   Assetgrok/style/<style>.{jpg,png}   → icon style (rebuttal/filibuster/bluster/provocation)
import Phaser from 'phaser';
import type { Style } from '../types';

type UrlMap = Record<string, string>;

function globUrls(glob: UrlMap): Record<string, string> {
  // glob: { '/Assetgrok/bg/pub.jpg': 'url' } → { 'pub': 'url' } (key = tên file, bỏ đuôi)
  const out: Record<string, string> = {};
  for (const [path, url] of Object.entries(glob)) {
    const file = path.split('/').pop() ?? '';
    const id = file.replace(/\.(jpg|jpeg|png)$/i, '');
    out[id] = url;
  }
  return out;
}

const BG_URLS = globUrls(
  import.meta.glob('/Assetgrok/bg/*.{jpg,jpeg,png}', {
    eager: true,
    query: '?url',
    import: 'default',
  }) as UrlMap,
);

const AVATAR_URLS = globUrls(
  import.meta.glob('/Assetgrok/avatar/*.{jpg,jpeg,png}', {
    eager: true,
    query: '?url',
    import: 'default',
  }) as UrlMap,
);

const STYLE_ICON_URLS = globUrls(
  import.meta.glob('/Assetgrok/style/*.{jpg,jpeg,png}', {
    eager: true,
    query: '?url',
    import: 'default',
  }) as UrlMap,
);

// ---- Texture keys (đăng ký ở BootScene) ----
export const bgKey = (id: string) => `bg-${id}`;
export const avatarKey = (id: string) => `avatar-${id}`;
export const styleIconKey = (style: Style) => `styleicon-${style}`;

/** Tất cả { texKey: url } cần load ở BootScene. */
export function sceneArtToLoad(): Array<{ key: string; url: string }> {
  const out: Array<{ key: string; url: string }> = [];
  for (const [id, url] of Object.entries(BG_URLS)) out.push({ key: bgKey(id), url });
  for (const [id, url] of Object.entries(AVATAR_URLS)) out.push({ key: avatarKey(id), url });
  for (const [id, url] of Object.entries(STYLE_ICON_URLS)) out.push({ key: styleIconKey(id as Style), url });
  return out;
}

/** Danh sách bg key có sẵn (rỗng nếu chưa thả ảnh nào). */
export const BG_KEYS = Object.keys(BG_URLS).map(bgKey);

/** Texture avatar cho 1 đội: ưu tiên file <teamID>, fallback _default, không có → null. */
export function teamAvatarKey(teamId: string): string | null {
  if (AVATAR_URLS[teamId]) return avatarKey(teamId);
  if (AVATAR_URLS['_default']) return avatarKey('_default');
  return null;
}

/** True nếu đã có icon cho style này. */
export const hasStyleIcon = (style: Style): boolean => !!STYLE_ICON_URLS[style];

/** Thêm background quán bia phủ kín VIEW (cover, không méo). Trả image hoặc null nếu chưa có art.
 *  Chọn 1 bg deterministic theo seed (mặc định 0 → bg đầu tiên). */
export function addBackground(
  scene: Phaser.Scene,
  viewW: number,
  viewH: number,
  seed = 0,
): Phaser.GameObjects.Image | null {
  if (BG_KEYS.length === 0) return null;
  const key = BG_KEYS[((seed % BG_KEYS.length) + BG_KEYS.length) % BG_KEYS.length];
  const img = scene.add.image(viewW / 2, viewH / 2, key).setDepth(-100);
  // cover: scale theo cạnh lớn hơn để phủ kín, phần thừa bị camera cắt
  const tex = scene.textures.get(key).getSourceImage();
  const scale = Math.max(viewW / tex.width, viewH / tex.height);
  img.setScale(scale);
  return img;
}

/** Image icon style (contain trong ô vuông size) hoặc null nếu chưa có art. */
export function styleIconImage(
  scene: Phaser.Scene,
  style: Style,
  size: number,
): Phaser.GameObjects.Image | null {
  const key = styleIconKey(style);
  if (!scene.textures.exists(key)) return null;
  const img = scene.add.image(0, 0, key);
  const tex = scene.textures.get(key).getSourceImage();
  const scale = size / Math.max(tex.width, tex.height); // contain → không méo
  img.setScale(scale);
  return img;
}
