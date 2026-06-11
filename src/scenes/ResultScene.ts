// src/scenes/ResultScene.ts — task 1.2: thắng/thua + nút chơi lại.
import Phaser from 'phaser';
import type { ResultSceneData } from '../types';
import { VIEW } from '../core/view';
import { SCENES } from './keys';
import { addText, makeTextButton, setupView } from './ui';

export class ResultScene extends Phaser.Scene {
  private won = false;

  constructor() {
    super(SCENES.RESULT);
  }

  init(data: ResultSceneData) {
    this.won = data.won ?? false;
  }

  create() {
    setupView(this);

    addText(this, VIEW.W / 2, VIEW.H * 0.3, this.won ? 'YOU WIN' : 'YOU LOSE', {
      fontSize: '84px',
      color: this.won ? '#22c55e' : '#ef4444',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    addText(
      this,
      VIEW.W / 2,
      VIEW.H * 0.3 + 72,
      this.won ? 'opponent has left the pub' : 'practice your banter and come back',
      { fontSize: '20px', color: '#cccccc' },
    ).setOrigin(0.5);

    makeTextButton(this, VIEW.W / 2, VIEW.H * 0.6, 'PLAY AGAIN', () => {
      this.scene.start(SCENES.STYLE_SELECT);
    });

    makeTextButton(
      this,
      VIEW.W / 2,
      VIEW.H * 0.6 + 92,
      'MENU',
      () => this.scene.start(SCENES.MENU),
      { width: 200, height: 52, fontSize: '20px' },
    );
  }
}
