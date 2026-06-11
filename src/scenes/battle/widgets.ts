// src/scenes/battle/widgets.ts — các widget placeholder của BattleScene (task 1.5).
// Chỉ là lớp hiển thị: nhận giá trị từ core qua refresh(), KHÔNG chứa logic gameplay.
// Phase 5 thay graphics bằng asset thật thì sửa từng widget ở đây.
import Phaser from 'phaser';
import type { CardDef, Style } from '../../types';
import {
  BALANCE,
  CONTENT_COLORS,
  CONTENT_LABELS,
  STYLE_COLORS,
  STYLE_LABELS,
} from '../../core/constants';
import { addText } from '../ui';

/** Thanh Mental Focus: nền + fill co theo máu + label số. */
export class MfBar extends Phaser.GameObjects.Container {
  private readonly fill: Phaser.GameObjects.Rectangle;
  private readonly label: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number, w: number, h: number, color: number) {
    super(scene, x, y);
    const bg = scene.add
      .rectangle(0, 0, w, h, 0x000000, 0.55)
      .setOrigin(0, 0.5)
      .setStrokeStyle(2, 0xffffff, 0.25);
    this.fill = scene.add.rectangle(2, 0, w - 4, h - 6, color).setOrigin(0, 0.5);
    this.label = addText(scene, w / 2, 0, '', { fontSize: '13px', color: '#ffffff' }).setOrigin(0.5);
    this.add([bg, this.fill, this.label]);
    scene.add.existing(this);
  }

  refresh(mf: number, mfMax: number) {
    this.fill.setScale(Math.max(0, mf / mfMax), 1);
    this.label.setText(`${Math.ceil(mf)} / ${mfMax}`);
  }
}

/** Bubble Inspiration: số + vòng regen quay quanh (Phaser Arc qua Graphics). */
export class InspirationBubble extends Phaser.GameObjects.Container {
  private readonly valueText: Phaser.GameObjects.Text;
  private readonly ring: Phaser.GameObjects.Graphics;
  private readonly radius = 36;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    const bg = scene.add.circle(0, 0, this.radius, 0x1f2a44).setStrokeStyle(3, 0x4a72ff, 0.9);
    this.valueText = addText(scene, 0, 0, '0', {
      fontSize: '30px',
      color: '#9ecbff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.ring = scene.add.graphics();
    const caption = addText(scene, 0, this.radius + 22, 'INSPIRATION', {
      fontSize: '11px',
      color: '#667799',
    }).setOrigin(0.5);
    this.add([bg, this.valueText, this.ring, caption]);
    scene.add.existing(this);
  }

  refresh(value: number, progress: number) {
    this.valueText.setText(String(value));
    this.ring.clear();
    if (progress > 0) {
      this.ring.lineStyle(4, 0x6ee7ff, 0.9);
      this.ring.beginPath();
      this.ring.arc(
        0,
        0,
        this.radius + 7,
        Phaser.Math.DegToRad(-90),
        Phaser.Math.DegToRad(-90 + 360 * progress),
      );
      this.ring.strokePath();
    }
  }
}

/** Style hiện tại của 1 bên: chấm màu + tên style + badge "+25%" khi đang khắc đối thủ. */
export class StyleIndicator extends Phaser.GameObjects.Container {
  private readonly circle: Phaser.GameObjects.Arc;
  private readonly label: Phaser.GameObjects.Text;
  private readonly advBadge: Phaser.GameObjects.Text;
  private current: Style | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    this.circle = scene.add.circle(0, 0, 22, 0xffffff).setStrokeStyle(2, 0xffffff, 0.5);
    this.label = addText(scene, 34, 0, '', {
      fontSize: '20px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5);
    const buffPct = Math.round((BALANCE.STYLE_BUFF - 1) * 100);
    this.advBadge = addText(scene, 34, 22, `▲ +${buffPct}% style advantage`, {
      fontSize: '12px',
      color: '#fddb00',
    })
      .setOrigin(0, 0.5)
      .setVisible(false);
    this.add([this.circle, this.label, this.advBadge]);
    scene.add.existing(this);
  }

  refresh(style: Style, hasAdvantage: boolean) {
    if (style !== this.current) {
      this.circle.setFillStyle(STYLE_COLORS[style]);
      this.label.setText(STYLE_LABELS[style]);
      this.current = style;
    }
    this.advBadge.setVisible(hasAdvantage);
  }
}

const ALL_STYLES = Object.keys(STYLE_LABELS) as Style[];

/** Nút switch style: vòng đếm ngược cooldown, sáng khi sẵn sàng,
 *  tap → mở picker 3 style còn lại, chọn → callback onPick. */
export class StyleSwitchButton extends Phaser.GameObjects.Container {
  private readonly ring: Phaser.GameObjects.Graphics;
  private readonly btn: Phaser.GameObjects.Arc;
  private readonly icon: Phaser.GameObjects.Text;
  private picker: Phaser.GameObjects.Container | null = null;
  private ready = false;
  private currentStyle: Style = 'rebuttal';

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    private readonly onPick: (style: Style) => void,
  ) {
    super(scene, x, y);
    this.btn = scene.add.circle(0, 0, 26, 0x2d2418).setStrokeStyle(2, 0x777777);
    this.icon = addText(scene, 0, 0, '⇄', { fontSize: '24px', color: '#777777' }).setOrigin(0.5);
    this.ring = scene.add.graphics();
    this.add([this.btn, this.icon, this.ring]);
    this.setDepth(10); // picker phải nổi trên hand card
    scene.add.existing(this);

    this.btn.setInteractive({ useHandCursor: true });
    this.btn.on('pointerdown', () => {
      if (!this.ready) return;
      if (this.picker) this.closePicker();
      else this.openPicker();
    });
  }

  refresh(progress: number, ready: boolean, currentStyle: Style) {
    this.currentStyle = currentStyle;
    if (ready !== this.ready) {
      this.ready = ready;
      this.btn.setStrokeStyle(2, ready ? 0xfddb00 : 0x777777);
      this.icon.setColor(ready ? '#fddb00' : '#777777');
      if (!ready) this.closePicker(); // vừa switch xong → vào cooldown → đóng picker
    }
    this.ring.clear();
    this.ring.lineStyle(3, ready ? 0xfddb00 : 0xaaaaaa, ready ? 1 : 0.7);
    this.ring.beginPath();
    this.ring.arc(
      0,
      0,
      33,
      Phaser.Math.DegToRad(-90),
      Phaser.Math.DegToRad(-90 + 360 * Math.min(1, progress)),
    );
    this.ring.strokePath();
  }

  private openPicker() {
    const scene = this.scene;
    this.picker = scene.add.container(0, -78);
    const others = ALL_STYLES.filter((s) => s !== this.currentStyle);
    others.forEach((style, i) => {
      const px = (i - 1) * 64;
      const c = scene.add.circle(px, 0, 20, STYLE_COLORS[style]).setStrokeStyle(2, 0xffffff, 0.7);
      const name = addText(scene, px, -32, STYLE_LABELS[style], {
        fontSize: '11px',
        color: '#ffffff',
      }).setOrigin(0.5);
      c.setInteractive({ useHandCursor: true });
      c.on('pointerdown', () => {
        this.closePicker();
        this.onPick(style);
      });
      this.picker!.add([c, name]);
    });
    this.add(this.picker);
  }

  private closePicker() {
    this.picker?.destroy();
    this.picker = null;
  }
}

/** 1 lá bài trên tay: khung + cost + tên + dải màu content type. */
export class CardView extends Phaser.GameObjects.Container {
  static readonly W = 140;
  static readonly H = 175;

  private readonly frame: Phaser.GameObjects.Rectangle;
  private readonly costText: Phaser.GameObjects.Text;
  private readonly nameText: Phaser.GameObjects.Text;
  private readonly strip: Phaser.GameObjects.Rectangle;
  private readonly stripLabel: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    const { W, H } = CardView;

    this.frame = scene.add.rectangle(0, 0, W, H, 0x2d2418).setStrokeStyle(2, 0xffffff);
    const costCircle = scene.add.circle(-W / 2 + 18, -H / 2 + 18, 15, 0x1f2a44)
      .setStrokeStyle(2, 0x9ecbff);
    this.costText = addText(scene, -W / 2 + 18, -H / 2 + 18, '', {
      fontSize: '17px',
      color: '#9ecbff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.nameText = addText(scene, 0, -8, '', {
      fontSize: '15px',
      color: '#ffffff',
      fontStyle: 'bold',
      align: 'center',
      wordWrap: { width: W - 16 },
    }).setOrigin(0.5);
    this.strip = scene.add.rectangle(0, H / 2 - 13, W - 4, 22, 0xffffff).setOrigin(0.5);
    this.stripLabel = addText(scene, 0, H / 2 - 13, '', {
      fontSize: '12px',
      color: '#1a120b',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add([this.frame, costCircle, this.costText, this.nameText, this.strip, this.stripLabel]);
    this.setSize(W, H);
    scene.add.existing(this);

    // hover nhấc nhẹ (desktop); tap chơi card là task 1.6
    this.setInteractive({ useHandCursor: true });
    this.on('pointerover', () => this.setY(this.y - 10));
    this.on('pointerout', () => this.setY(this.y + 10));
  }

  setCard(card: CardDef) {
    this.frame.setStrokeStyle(2, CONTENT_COLORS[card.content]);
    this.costText.setText(String(card.cost));
    this.nameText.setText(card.name);
    this.strip.setFillStyle(CONTENT_COLORS[card.content]);
    this.stripLabel.setText(CONTENT_LABELS[card.content]);
  }

  /** Thiếu Inspiration → mờ đi (chặn tap thật ở task 1.6). */
  setAffordable(ok: boolean) {
    this.setAlpha(ok ? 1 : 0.4);
  }
}
