// src/scenes/BattleScene.ts — STUB cho task 1.2: chỉ để test scene flow đầy đủ.
// UI battle thật build ở task 1.5/1.6; nút WIN/LOSE test sẽ bị thay khi có win/lose thật (task 1.8).
import Phaser from 'phaser';
import type { BattleSceneData, ResultSceneData, Style } from '../types';
import { STYLE_COLORS, STYLE_LABELS } from '../core/constants';
import { VIEW } from '../core/view';
import { SCENES } from './keys';
import { addText, makeTextButton, setupView } from './ui';

export class BattleScene extends Phaser.Scene {
  private playerStyle: Style = 'rebuttal';

  constructor() {
    super(SCENES.BATTLE);
  }

  init(data: BattleSceneData) {
    this.playerStyle = data.playerStyle ?? 'rebuttal';
  }

  create() {
    setupView(this);

    addText(this, VIEW.W / 2, VIEW.H * 0.22, 'BATTLE — placeholder (task 1.5)', {
      fontSize: '32px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.circle(VIEW.W / 2, VIEW.H * 0.42, 30, STYLE_COLORS[this.playerStyle]);
    addText(this, VIEW.W / 2, VIEW.H * 0.42 + 52, `Your style: ${STYLE_LABELS[this.playerStyle]}`, {
      fontSize: '22px',
      color: '#cccccc',
    }).setOrigin(0.5);

    makeTextButton(this, VIEW.W / 2 - 150, VIEW.H * 0.72, 'WIN (test)', () => this.end(true), {
      width: 240,
    });
    makeTextButton(this, VIEW.W / 2 + 150, VIEW.H * 0.72, 'LOSE (test)', () => this.end(false), {
      width: 240,
    });
  }

  private end(won: boolean) {
    const data: ResultSceneData = { won };
    this.scene.start(SCENES.RESULT, data);
  }
}
