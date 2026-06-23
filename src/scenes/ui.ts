// src/scenes/ui.ts — helper UI placeholder dùng chung (Phase 1, chưa có asset).
import Phaser from 'phaser';
import { RENDER_SCALE, TEXT_RESOLUTION, VIEW } from '../core/view';
import { sfx } from '../audio';

/** Gọi đầu create() của MỌI scene: camera vẽ vùng thiết kế VIEW vào
 *  framebuffer supersample (chống mờ). Toạ độ trong scene vẫn là 1280x720. */
export function setupView(scene: Phaser.Scene) {
  scene.cameras.main.setZoom(RENDER_SCALE).centerOn(VIEW.W / 2, VIEW.H / 2);
}

/** Thay cho scene.add.text — tự gắn resolution để chữ nét dưới camera zoom. */
export function addText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  str: string,
  style: Phaser.Types.GameObjects.Text.TextStyle = {},
): Phaser.GameObjects.Text {
  return scene.add.text(x, y, str, { resolution: TEXT_RESOLUTION, ...style });
}

export interface TextButtonOpts {
  width?: number;
  height?: number;
  fontSize?: string;
  bgColor?: number;
  bgHover?: number;
  textColor?: string;
}

/** Nút placeholder: rect + text. Mobile-first: kích thước mặc định đủ to để tap. */
export function makeTextButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onTap: () => void,
  opts: TextButtonOpts = {},
): Phaser.GameObjects.Container {
  const w = opts.width ?? 280;
  const h = opts.height ?? 64;
  const bg = opts.bgColor ?? 0x2d2418;
  const hover = opts.bgHover ?? 0x4a3a24;

  const rect = scene.add.rectangle(0, 0, w, h, bg).setStrokeStyle(2, 0xfddb00);
  const text = addText(scene, 0, 0, label, {
    fontSize: opts.fontSize ?? '24px',
    color: opts.textColor ?? '#ffffff',
    fontStyle: 'bold',
  }).setOrigin(0.5);

  const container = scene.add.container(x, y, [rect, text]);
  container.setSize(w, h);
  container.setInteractive({ useHandCursor: true });
  container.on('pointerover', () => rect.setFillStyle(hover));
  container.on('pointerout', () => rect.setFillStyle(bg));
  container.on('pointerdown', () => {
    sfx.unlock(); // user gesture → mở khoá audio
    sfx.play('click');
    onTap();
  });
  return container;
}

/** Nút bật/tắt tiếng (🔊/🔇), góc trên phải. Trạng thái lưu localStorage. */
export function makeMuteButton(scene: Phaser.Scene, x: number, y: number): Phaser.GameObjects.Text {
  const label = () => (sfx.isMuted ? '🔇' : '🔊');
  const t = addText(scene, x, y, label(), { fontSize: '22px' })
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true })
    .setAlpha(0.8);
  t.on('pointerdown', () => {
    sfx.unlock();
    sfx.toggleMute();
    t.setText(label());
    if (!sfx.isMuted) sfx.play('click');
  });
  return t;
}
