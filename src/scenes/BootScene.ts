// src/scenes/BootScene.ts — task 1.2: load asset (placeholder) rồi chuyển MenuScene.
import Phaser from 'phaser';
import { VIEW } from '../core/view';
import { CARD_ART, cardArtKey } from '../data/cardArt';
import { sceneArtToLoad } from '../data/sceneArt';
import { SCENES } from './keys';
import { addText, setupView } from './ui';

export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENES.BOOT);
  }

  preload() {
    setupView(this);
    addText(this, VIEW.W / 2, VIEW.H / 2, 'loading...', {
      fontSize: '20px',
      color: '#888888',
    }).setOrigin(0.5);

    // Phase 5: card art (chibi cartoon Grok) — chỉ load card đã có file trong Assetgrok/.
    // Card chưa có art → CardView tự dùng placeholder graphics.
    for (const [id, url] of Object.entries(CARD_ART)) {
      this.load.image(cardArtKey(id), url);
    }
    // Phase 5: background quán bia + avatar đội + icon style (sceneArt.ts glob).
    // Chưa thả ảnh → list rỗng → game tự dùng placeholder graphics.
    for (const { key, url } of sceneArtToLoad()) {
      this.load.image(key, url);
    }
    // Phase 5 TODO: SFX file thật (hiện procedural Web Audio trong audio.ts).
  }

  create() {
    this.scene.start(SCENES.MENU);
  }
}
