// src/scenes/battle/qte.ts — UI cho Trash Talk QTE (task 2.1). Chỉ hiển thị,
// state machine nằm ở core/TrashTalkQTE.ts.
import Phaser from 'phaser';
import type { QteKey } from '../../core/TrashTalkQTE';
import { addText } from '../ui';

/** 2 nút Q (trái) / E (phải) tap-to cho mobile, phím cứng cho desktop.
 *  Nút cần nhấn sáng vàng + vòng đếm ngược; nút kia mờ (tap nhầm = mất cơ hội). */
export class QtePromptView extends Phaser.GameObjects.Container {
  private readonly zones: Record<QteKey, { circle: Phaser.GameObjects.Arc; letter: Phaser.GameObjects.Text }>;
  private readonly ring: Phaser.GameObjects.Graphics;
  private target: QteKey = 'Q';
  private pulse: Phaser.Tweens.Tween | null = null;

  constructor(scene: Phaser.Scene, private readonly onPress: (key: QteKey) => void) {
    super(scene, 0, 0);
    this.ring = scene.add.graphics();

    const make = (key: QteKey, x: number) => {
      const circle = scene.add.circle(x, 360, 54, 0x1a1208, 0.9).setStrokeStyle(4, 0xfddb00);
      const letter = addText(scene, x, 360, key, {
        fontSize: '52px',
        color: '#fddb00',
        fontStyle: 'bold',
      }).setOrigin(0.5);
      circle.setInteractive({ useHandCursor: true });
      circle.on('pointerdown', () => this.onPress(key));
      return { circle, letter };
    };
    this.zones = { Q: make('Q', 240), E: make('E', 1040) };
    this.add([this.ring, this.zones.Q.circle, this.zones.Q.letter, this.zones.E.circle, this.zones.E.letter]);
    this.setDepth(30);
    this.setVisible(false);
    scene.add.existing(this);
  }

  show(target: QteKey) {
    this.target = target;
    for (const key of ['Q', 'E'] as QteKey[]) {
      const hot = key === target;
      const z = this.zones[key];
      z.circle.setStrokeStyle(hot ? 5 : 2, hot ? 0xfddb00 : 0x666666);
      z.circle.setFillStyle(0x1a1208, hot ? 0.95 : 0.5);
      z.letter.setColor(hot ? '#fddb00' : '#666666');
      z.circle.setScale(1);
      z.letter.setScale(1);
    }
    this.setVisible(true);
    // pulse nút cần nhấn cho bắt mắt
    const hot = this.zones[target];
    this.pulse?.stop();
    this.pulse = this.scene.tweens.add({
      targets: [hot.circle, hot.letter],
      scale: 1.15,
      duration: 160,
      yoyo: true,
      repeat: -1,
    });
  }

  /** Vòng đếm ngược quanh nút cần nhấn (progress 1 → 0). */
  refreshRing(progress: number) {
    this.ring.clear();
    if (!this.visible || progress <= 0) return;
    const x = this.target === 'Q' ? 240 : 1040;
    this.ring.lineStyle(5, 0xffffff, 0.9);
    this.ring.beginPath();
    this.ring.arc(x, 360, 64, Phaser.Math.DegToRad(-90), Phaser.Math.DegToRad(-90 + 360 * progress));
    this.ring.strokePath();
  }

  hide() {
    this.pulse?.stop();
    this.pulse = null;
    this.ring.clear();
    this.setVisible(false);
  }
}

export interface TrashTalkOptionView {
  text: string;
  tag: string; // tóm tắt effect: "DMG 150" / "DMG 40 · +3 INSP" / "DMG 40 · SILENCE"
}

/** Menu 3 option sau khi nhấn kịp Q/E + thanh countdown tự đóng. */
export class TrashTalkMenu extends Phaser.GameObjects.Container {
  private readonly bar: Phaser.GameObjects.Rectangle;
  private rows: Phaser.GameObjects.Container[] = [];
  private static readonly ROW_W = 540;
  private static readonly ROW_H = 58;

  constructor(scene: Phaser.Scene) {
    super(scene, 640, 320);
    this.bar = scene.add.rectangle(0, 118, TrashTalkMenu.ROW_W, 6, 0xfddb00).setOrigin(0.5);
    this.add(this.bar);
    this.setDepth(31);
    this.setVisible(false);
    scene.add.existing(this);
  }

  show(options: TrashTalkOptionView[], onPick: (index: number) => void) {
    this.rows.forEach((r) => r.destroy());
    this.rows = options.map((opt, i) => {
      const row = this.scene.add.container(0, (i - 1) * 68);
      const bg = this.scene.add
        .rectangle(0, 0, TrashTalkMenu.ROW_W, TrashTalkMenu.ROW_H, 0x26201a, 0.97)
        .setStrokeStyle(2, 0xfddb00, 0.9);
      const text = addText(this.scene, -TrashTalkMenu.ROW_W / 2 + 14, 0, opt.text, {
        fontSize: '14px',
        color: '#fff8ee',
        wordWrap: { width: TrashTalkMenu.ROW_W - 160 },
      }).setOrigin(0, 0.5);
      const tag = addText(this.scene, TrashTalkMenu.ROW_W / 2 - 12, 0, opt.tag, {
        fontSize: '12px',
        color: '#fddb00',
        fontStyle: 'bold',
        align: 'right',
      }).setOrigin(1, 0.5);
      row.add([bg, text, tag]);
      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerover', () => bg.setFillStyle(0x3a3026, 0.97));
      bg.on('pointerout', () => bg.setFillStyle(0x26201a, 0.97));
      bg.on('pointerdown', () => onPick(i));
      this.add(row);
      return row;
    });
    this.setVisible(true);
    this.setScale(0.8);
    this.scene.tweens.add({ targets: this, scale: 1, duration: 160, ease: 'Back.easeOut' });
  }

  refreshBar(progress: number) {
    this.bar.setScale(Math.max(0, progress), 1);
  }

  hide() {
    this.setVisible(false);
  }
}
