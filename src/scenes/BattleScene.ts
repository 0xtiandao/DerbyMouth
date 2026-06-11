// src/scenes/BattleScene.ts — STUB cho task 1.2: chỉ để test scene flow đầy đủ.
// UI battle thật build ở task 1.5/1.6; nút WIN/LOSE test sẽ bị thay khi có win/lose thật (task 1.8).
import Phaser from 'phaser';
import type { BattleSceneData, ResultSceneData, Style } from '../types';
import { STYLE_COLORS, STYLE_LABELS } from '../core/constants';
import { SCENES } from './keys';
import { makeTextButton } from './ui';

export class BattleScene extends Phaser.Scene {
  private playerStyle: Style = 'rebuttal';

  constructor() {
    super(SCENES.BATTLE);
  }

  init(data: BattleSceneData) {
    this.playerStyle = data.playerStyle ?? 'rebuttal';
  }

  create() {
    const { width, height } = this.scale;

    this.add
      .text(width / 2, height * 0.22, 'BATTLE — placeholder (task 1.5)', {
        fontSize: '32px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add.circle(width / 2, height * 0.42, 30, STYLE_COLORS[this.playerStyle]);
    this.add
      .text(width / 2, height * 0.42 + 52, `Your style: ${STYLE_LABELS[this.playerStyle]}`, {
        fontSize: '22px',
        color: '#cccccc',
      })
      .setOrigin(0.5);

    makeTextButton(this, width / 2 - 150, height * 0.72, 'WIN (test)', () => this.end(true), {
      width: 240,
    });
    makeTextButton(this, width / 2 + 150, height * 0.72, 'LOSE (test)', () => this.end(false), {
      width: 240,
    });
  }

  private end(won: boolean) {
    const data: ResultSceneData = { won };
    this.scene.start(SCENES.RESULT, data);
  }
}
