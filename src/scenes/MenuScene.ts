// src/scenes/MenuScene.ts — task 1.2: title + nút "PVE Battle" → StyleSelectScene.
import Phaser from 'phaser';
import { VIEW } from '../core/view';
import { SCENES } from './keys';
import { addText, makeTextButton, setupView } from './ui';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super(SCENES.MENU);
  }

  create() {
    setupView(this);

    addText(this, VIEW.W / 2, VIEW.H * 0.3, 'DERBYMOUTH', {
      fontSize: '72px',
      color: '#fddb00',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    addText(this, VIEW.W / 2, VIEW.H * 0.3 + 60, 'World Cup 2026 pub banter battle', {
      fontSize: '20px',
      color: '#cccccc',
    }).setOrigin(0.5);

    makeTextButton(this, VIEW.W / 2, VIEW.H * 0.6, 'PVE BATTLE', () => {
      this.scene.start(SCENES.STYLE_SELECT);
    });
  }
}
