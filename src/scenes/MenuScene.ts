// src/scenes/MenuScene.ts — task 1.2: title + nút "PVE Battle" → StyleSelectScene.
import Phaser from 'phaser';
import { SCENES } from './keys';
import { makeTextButton } from './ui';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super(SCENES.MENU);
  }

  create() {
    const { width, height } = this.scale;

    this.add
      .text(width / 2, height * 0.3, 'DERBYMOUTH', {
        fontSize: '72px',
        color: '#fddb00',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height * 0.3 + 60, 'World Cup 2026 pub banter battle', {
        fontSize: '20px',
        color: '#cccccc',
      })
      .setOrigin(0.5);

    makeTextButton(this, width / 2, height * 0.6, 'PVE BATTLE', () => {
      this.scene.start(SCENES.STYLE_SELECT);
    });
  }
}
