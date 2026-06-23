// src/scenes/battle/widgets.ts — các widget placeholder của BattleScene (task 1.5).
// Chỉ là lớp hiển thị: nhận giá trị từ core qua refresh(), KHÔNG chứa logic gameplay.
// Phase 5 thay graphics bằng asset thật thì sửa từng widget ở đây.
import Phaser from 'phaser';
import type { CardDef, Style, Team } from '../../types';
import {
  BALANCE,
  CONTENT_COLORS,
  CONTENT_LABELS,
  STYLE_COLORS,
  STYLE_LABELS,
} from '../../core/constants';
import { styleIconImage, teamAvatarKey } from '../../data/sceneArt';
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
  private icon: Phaser.GameObjects.Image | null = null;

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
      // icon style (nếu đã có art) — đè lên chấm màu, contain trong đường kính ~40
      this.icon?.destroy();
      this.icon = styleIconImage(this.scene, style, 40);
      if (this.icon) this.addAt(this.icon, 1); // trên circle, dưới label
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
      const icon = styleIconImage(scene, style, 34); // icon đè lên chấm màu (nếu có art)
      if (icon) this.picker!.add(icon.setPosition(px, 0).setInteractive({ useHandCursor: true })
        .on('pointerdown', () => { this.closePicker(); this.onPick(style); }));
    });
    this.add(this.picker);
  }

  private closePicker() {
    this.picker?.destroy();
    this.picker = null;
  }
}

/** Speech bubble: rounded rect + tail + text, pop tween khi show, tự fade sau 2.6s.
 *  Dùng cho cả player (trái, task 1.6) và NPC (phải, task 1.7). */
export class SpeechBubble extends Phaser.GameObjects.Container {
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly text: Phaser.GameObjects.Text;
  private hideTimer: Phaser.Time.TimerEvent | null = null;
  private readonly maxWidth = 380;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    private readonly tailSide: 'left' | 'right',
  ) {
    super(scene, x, y);
    this.g = scene.add.graphics();
    this.text = addText(scene, 0, 0, '', {
      fontSize: '17px',
      color: '#1a120b',
      fontStyle: 'bold',
      align: 'left',
      wordWrap: { width: this.maxWidth - 32 },
    }).setOrigin(0.5);
    this.add([this.g, this.text]);
    this.setVisible(false);
    this.setDepth(5);
    scene.add.existing(this);
  }

  show(message: string, accent: number) {
    this.hideTimer?.remove();
    this.scene.tweens.killTweensOf(this);
    this.setAlpha(1);

    this.text.setText(message);
    const w = Math.max(120, Math.min(this.maxWidth, this.text.width + 32));
    const h = this.text.height + 24;

    this.g.clear();
    this.g.fillStyle(0xfff8ee, 1);
    this.g.lineStyle(3, accent, 1);
    this.g.fillRoundedRect(-w / 2, -h / 2, w, h, 12);
    this.g.strokeRoundedRect(-w / 2, -h / 2, w, h, 12);
    // đuôi chỉ xuống phía người nói
    const tx = this.tailSide === 'left' ? -w / 4 : w / 4;
    this.g.fillTriangle(tx - 10, h / 2 - 1, tx + 10, h / 2 - 1, tx, h / 2 + 16);
    this.g.lineStyle(0, 0, 0);

    this.setVisible(true);
    this.setScale(0.4);
    this.scene.tweens.add({ targets: this, scale: 1, duration: 220, ease: 'Back.easeOut' });

    this.hideTimer = this.scene.time.delayedCall(2600, () => {
      this.scene.tweens.add({
        targets: this,
        alpha: 0,
        duration: 300,
        onComplete: () => this.setVisible(false).setAlpha(1),
      });
    });
  }
}

/** Nút bia "Liquid Courage": vòng cooldown như nút switch, sáng khi sẵn sàng;
 *  đang uống → vòng xanh lá chạy theo channel progress. */
export class BeerButton extends Phaser.GameObjects.Container {
  private readonly ring: Phaser.GameObjects.Graphics;
  private readonly btn: Phaser.GameObjects.Arc;
  private readonly icon: Phaser.GameObjects.Text;
  private ready = false;

  constructor(scene: Phaser.Scene, x: number, y: number, onTap: () => void) {
    super(scene, x, y);
    this.btn = scene.add.circle(0, 0, 26, 0x2d2418).setStrokeStyle(2, 0x777777);
    this.icon = addText(scene, 0, 0, '🍺', { fontSize: '22px' }).setOrigin(0.5).setAlpha(0.5);
    this.ring = scene.add.graphics();
    this.add([this.btn, this.icon, this.ring]);
    scene.add.existing(this);

    this.btn.setInteractive({ useHandCursor: true });
    this.btn.on('pointerdown', onTap);
  }

  refresh(opts: {
    ready: boolean;
    cooldownProgress: number;
    channeling: boolean;
    channelProgress: number;
  }) {
    if (opts.ready !== this.ready) {
      this.ready = opts.ready;
      this.btn.setStrokeStyle(2, opts.ready ? 0xfddb00 : 0x777777);
      this.icon.setAlpha(opts.ready ? 1 : 0.5);
    }
    this.ring.clear();
    if (opts.channeling) {
      // đang uống: vòng xanh lá đầy dần
      this.ring.lineStyle(4, 0x22c55e, 1);
      this.drawArc(opts.channelProgress);
    } else {
      this.ring.lineStyle(3, opts.ready ? 0xfddb00 : 0xaaaaaa, opts.ready ? 1 : 0.7);
      this.drawArc(opts.cooldownProgress);
    }
  }

  private drawArc(progress: number) {
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
}

export interface BanterEntry {
  side: 'player' | 'opponent'; // player = căn phải, opponent = căn trái (kiểu chat)
  name: string;
  time: string; // mốc đồng hồ trận lúc nói
  line: string;
  accent: number; // màu content type — viền bubble
  avatarColor: number; // màu đội (placeholder avatar tới Phase 5)
}

/** Lịch sử hội thoại chửi nhau kiểu chat (như WWM): avatar + tên + giờ + bong bóng
 *  tin nhắn bo góc. Entry mới vào đáy, cũ đẩy lên + mờ nhẹ, tràn khung thì bỏ. */
export class BanterLog extends Phaser.GameObjects.Container {
  private entries: { node: Phaser.GameObjects.Container; h: number }[] = [];
  private readonly pad = 10;
  private readonly topLimit = 32; // chừa chỗ title

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    private readonly boxW: number,
    private readonly boxH: number,
  ) {
    super(scene, x, y);
    const bg = scene.add
      .rectangle(0, 0, boxW, boxH, 0x000000, 0.35)
      .setOrigin(0)
      .setStrokeStyle(1, 0xffffff, 0.18);
    const title = addText(scene, this.pad, 8, 'BANTER LOG', {
      fontSize: '12px',
      color: '#776655',
      fontStyle: 'bold',
    });
    this.add([bg, title]);
    scene.add.existing(this);
  }

  push(data: BanterEntry) {
    const scene = this.scene;
    const innerW = this.boxW - this.pad * 2;
    const isRight = data.side === 'player';
    const entry = scene.add.container(this.pad, 0);

    // avatar tròn màu đội (Phase 5 thay bằng ảnh nhân vật)
    const avatar = scene.add
      .circle(isRight ? innerW - 14 : 14, 12, 12, data.avatarColor)
      .setStrokeStyle(1.5, 0xffffff, 0.5);

    const nameText = addText(scene, isRight ? innerW - 32 : 32, 5, `${data.name} · ${data.time}`, {
      fontSize: '11px',
      color: '#9a8c7a',
    }).setOrigin(isRight ? 1 : 0, 0);

    // bong bóng tin nhắn bo góc, viền màu content type
    const bubbleMaxW = innerW - 44;
    const msg = addText(scene, 0, 0, data.line, {
      fontSize: '13px',
      color: '#e8e2d8',
      wordWrap: { width: bubbleMaxW - 20 },
      lineSpacing: 2,
    });
    const bw = Math.min(bubbleMaxW, msg.width + 20);
    const bh = msg.height + 14;
    const bx = isRight ? innerW - 32 - bw : 32;
    const by = 26;
    const g = scene.add.graphics();
    g.fillStyle(0x26201a, 0.95);
    g.lineStyle(1.5, data.accent, 0.9);
    g.fillRoundedRect(bx, by, bw, bh, 8);
    g.strokeRoundedRect(bx, by, bw, bh, 8);
    msg.setPosition(bx + 10, by + 7);

    entry.add([g, avatar, nameText, msg]);
    this.add(entry);
    this.entries.push({ node: entry, h: by + bh });
    this.relayout();
  }

  private relayout() {
    let yCursor = this.boxH - this.pad;
    for (let i = this.entries.length - 1; i >= 0; i--) {
      const e = this.entries[i];
      yCursor -= e.h;
      if (yCursor < this.topLimit) {
        // hết chỗ → bỏ entry này và mọi entry cũ hơn
        this.entries.splice(0, i + 1).forEach((old) => old.node.destroy());
        break;
      }
      e.node.setY(yCursor);
      e.node.setAlpha(i === this.entries.length - 1 ? 1 : 0.8);
      yCursor -= 10;
    }
  }
}

/** Avatar nhân vật giữa màn (player/NPC): ảnh chibi theo đội nếu có art,
 *  không thì circle màu đội + mã đội (placeholder). Phase 5 thay art bằng cách
 *  thả Assetgrok/avatar/<teamID>.jpg — tự nhận, KHÔNG cần sửa code. */
export class AvatarView extends Phaser.GameObjects.Container {
  private readonly circle: Phaser.GameObjects.Arc;
  private readonly initials: Phaser.GameObjects.Text;
  private art: Phaser.GameObjects.Image | null = null;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    private readonly size: number, // chiều cao mục tiêu khi có art / đường kính circle ≈ size*0.62
    private readonly faceLeft = false, // NPC quay mặt sang trái về phía player
  ) {
    super(scene, x, y);
    const r = Math.round(size * 0.31);
    this.circle = scene.add.circle(0, 0, r, 0x888888).setStrokeStyle(3, 0xffffff, 0.4);
    this.initials = addText(scene, 0, 0, '', {
      fontSize: `${Math.round(r * 0.8)}px`,
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add([this.circle, this.initials]);
    scene.add.existing(this);
  }

  setTeam(team: Team) {
    const key = teamAvatarKey(team.id);
    if (key && this.scene.textures.exists(key)) {
      if (!this.art) {
        this.art = this.scene.add.image(0, 0, key);
        this.addAt(this.art, 0);
      }
      const tex = this.scene.textures.get(key).getSourceImage();
      const scale = this.size / tex.height; // fit theo chiều cao, giữ tỉ lệ
      this.art.setTexture(key).setScale(scale).setFlipX(this.faceLeft).setVisible(true);
      this.circle.setVisible(false);
      this.initials.setVisible(false);
    } else {
      this.art?.setVisible(false);
      this.circle.setFillStyle(team.color).setVisible(true);
      this.initials.setText(team.id).setVisible(true);
    }
  }

  /** Tween "bối rối" khi NPC bị roast (thay cho rung avatar circle cũ). */
  fluster() {
    const x0 = this.x;
    this.scene.tweens.add({
      targets: this, x: x0 + 8, duration: 50, yoyo: true, repeat: 5,
      onComplete: () => this.setX(x0),
    });
  }
}

/** 1 lá bài trên tay: art chibi (nếu có) + cost + tên + dải màu content type. */
export class CardView extends Phaser.GameObjects.Container {
  // tỉ lệ 2:3 khớp art Grok (768×1152) → cover không méo, không crop
  static readonly W = 128;
  static readonly H = 192;

  private readonly frame: Phaser.GameObjects.Rectangle;
  private readonly costText: Phaser.GameObjects.Text;
  private readonly nameText: Phaser.GameObjects.Text;
  private readonly nameBar: Phaser.GameObjects.Rectangle;
  private readonly strip: Phaser.GameObjects.Rectangle;
  private readonly stripLabel: Phaser.GameObjects.Text;
  private art: Phaser.GameObjects.Image | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    const { W, H } = CardView;

    this.frame = scene.add.rectangle(0, 0, W, H, 0x2d2418).setStrokeStyle(2, 0xffffff);
    const costCircle = scene.add.circle(-W / 2 + 17, -H / 2 + 17, 15, 0x1f2a44)
      .setStrokeStyle(2, 0x9ecbff);
    this.costText = addText(scene, -W / 2 + 17, -H / 2 + 17, '', {
      fontSize: '17px',
      color: '#9ecbff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    // tên: khi có art nằm trên 1 dải tối mờ phía dưới (dễ đọc), khi placeholder ở giữa
    this.nameBar = scene.add.rectangle(0, H / 2 - 30, W - 4, 22, 0x000000, 0.55)
      .setOrigin(0.5)
      .setVisible(false);
    this.nameText = addText(scene, 0, -8, '', {
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold',
      align: 'center',
      wordWrap: { width: W - 16 },
    }).setOrigin(0.5);
    this.strip = scene.add.rectangle(0, H / 2 - 11, W - 4, 20, 0xffffff).setOrigin(0.5);
    this.stripLabel = addText(scene, 0, H / 2 - 11, '', {
      fontSize: '11px',
      color: '#1a120b',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add([this.frame, this.nameBar, this.nameText, costCircle, this.costText, this.strip, this.stripLabel]);
    this.setSize(W, H);
    scene.add.existing(this);

    // hover nhấc nhẹ (desktop); tap chơi card là task 1.6
    this.setInteractive({ useHandCursor: true });
    this.on('pointerover', () => this.setY(this.y - 10));
    this.on('pointerout', () => this.setY(this.y + 10));
  }

  setCard(card: CardDef) {
    const { W, H } = CardView;
    const artKey = `card-${card.id}`;
    const hasArt = this.scene.textures.exists(artKey);

    if (hasArt) {
      if (!this.art) {
        this.art = this.scene.add.image(0, 0, artKey);
        this.addAt(this.art, 1); // trên frame, dưới cost/name/strip
      }
      this.art.setTexture(artKey).setDisplaySize(W, H).setVisible(true);
      this.frame.setFillStyle(0x2d2418, 0); // art đã có nền/khung riêng
      this.nameBar.setVisible(true);
      this.nameText.setPosition(0, H / 2 - 30); // tên trên dải tối dưới đáy
    } else {
      this.art?.setVisible(false);
      this.frame.setFillStyle(0x2d2418, 1);
      this.nameBar.setVisible(false);
      this.nameText.setPosition(0, -8); // tên giữa lá placeholder
    }

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

  /** Cost thực tế (F4 costUp làm tăng) — đỏ khi đang bị đội giá. */
  refreshCost(cost: number, raised: boolean) {
    this.costText.setText(String(cost));
    this.costText.setColor(raised ? '#ef4444' : '#9ecbff');
  }
}
