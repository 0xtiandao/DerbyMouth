// src/scenes/BootScene.ts — task 1.2: load asset (placeholder) rồi chuyển MenuScene.
import Phaser from 'phaser';
import { SCENES } from './keys';

export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENES.BOOT);
  }

  preload() {
    // Phase 1 chưa có asset thật. Phase 5: load ảnh/sfx ở đây,
    // nối progress bar vào this.load.on('progress').
    const { width, height } = this.scale;
    this.add
      .text(width / 2, height / 2, 'loading...', { fontSize: '20px', color: '#888888' })
      .setOrigin(0.5);
  }

  create() {
    this.scene.start(SCENES.MENU);
  }
}
