// src/scenes/StyleSelectScene.ts — task 1.2: 4 style vòng tròn (như ảnh WWM), chọn 1 → BattleScene.
import Phaser from 'phaser';
import type { BattleSceneData, Style } from '../types';
import { BALANCE, STYLE_COLORS, STYLE_COUNTERS, STYLE_LABELS, STYLE_TAGLINES } from '../core/constants';
import { VIEW } from '../core/view';
import { SCENES } from './keys';
import { addText, setupView } from './ui';

export class StyleSelectScene extends Phaser.Scene {
  constructor() {
    super(SCENES.STYLE_SELECT);
  }

  create() {
    setupView(this);

    addText(this, VIEW.W / 2, 52, 'CHOOSE YOUR STYLE', {
      fontSize: '40px',
      color: '#fddb00',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const cx = VIEW.W / 2;
    const cy = VIEW.H / 2 + 24;
    const ringR = 190;
    const nodeR = 58;

    // Thứ tự quanh vòng = chiều khắc chế, suy từ STYLE_COUNTERS (không hardcode vòng RPS)
    const order: Style[] = ['rebuttal'];
    while (order.length < 4) order.push(STYLE_COUNTERS[order[order.length - 1]]);

    const ring = this.add.graphics();
    ring.lineStyle(2, 0x665533, 1);
    ring.strokeCircle(cx, cy, ringR);

    order.forEach((style, i) => {
      const theta = (-90 + i * 90) * Phaser.Math.DEG_TO_RAD;
      const x = cx + ringR * Math.cos(theta);
      const y = cy + ringR * Math.sin(theta);

      // Mũi tên trên cung node này → node kế (chiều "khắc")
      const mid = (-90 + i * 90 + 45) * Phaser.Math.DEG_TO_RAD;
      const ax = cx + ringR * Math.cos(mid);
      const ay = cy + ringR * Math.sin(mid);
      const arrow = this.add.triangle(ax, ay, -8, -7, 10, 0, -8, 7, 0xfddb00);
      arrow.setRotation(Math.atan2(Math.cos(mid), -Math.sin(mid)));

      const circle = this.add.circle(x, y, nodeR, STYLE_COLORS[style]);
      circle.setStrokeStyle(3, 0xffffff, 0.6);
      addText(this, x, y, STYLE_LABELS[style], {
        fontSize: '16px',
        color: '#1a120b',
        fontStyle: 'bold',
      }).setOrigin(0.5);
      addText(this, x, y + nodeR + 18, STYLE_TAGLINES[style], {
        fontSize: '14px',
        color: '#aaaaaa',
      }).setOrigin(0.5);

      circle.setInteractive({ useHandCursor: true });
      circle.on('pointerover', () => circle.setScale(1.08));
      circle.on('pointerout', () => circle.setScale(1));
      circle.on('pointerdown', () => {
        const data: BattleSceneData = { playerStyle: style };
        this.scene.start(SCENES.BATTLE, data);
      });
    });

    const buffPct = Math.round((BALANCE.STYLE_BUFF - 1) * 100);
    addText(this, cx, VIEW.H - 26, `▶ = counters — style advantage = +${buffPct}% dmg · switch again every ${BALANCE.STYLE_SWITCH_COOLDOWN_MS / 1000}s in battle`, {
      fontSize: '15px',
      color: '#888888',
    }).setOrigin(0.5);
  }
}
