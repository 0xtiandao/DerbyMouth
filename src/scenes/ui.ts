// src/scenes/ui.ts — helper UI placeholder dùng chung (Phase 1, chưa có asset).
import Phaser from 'phaser';

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
  const text = scene.add
    .text(0, 0, label, {
      fontSize: opts.fontSize ?? '24px',
      color: opts.textColor ?? '#ffffff',
      fontStyle: 'bold',
    })
    .setOrigin(0.5);

  const container = scene.add.container(x, y, [rect, text]);
  container.setSize(w, h);
  container.setInteractive({ useHandCursor: true });
  container.on('pointerover', () => rect.setFillStyle(hover));
  container.on('pointerout', () => rect.setFillStyle(bg));
  container.on('pointerdown', onTap);
  return container;
}
