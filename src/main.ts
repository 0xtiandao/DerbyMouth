// src/main.ts — Phaser config + đăng ký scene flow (task 1.2):
// Boot → Menu → StyleSelect → Battle → Result
// Canvas nội bộ = VIEW × RENDER_SCALE (supersample chống mờ chữ — xem core/view.ts).
import Phaser from 'phaser';
import { RENDER_SCALE, VIEW } from './core/view';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { ProfileScene } from './scenes/ProfileScene';
import { PvpLobbyScene } from './scenes/PvpLobbyScene';
import { StyleSelectScene } from './scenes/StyleSelectScene';
import { BattleScene } from './scenes/BattleScene';
import { ResultScene } from './scenes/ResultScene';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#1a120b',
  render: {
    antialias: true,
    roundPixels: true,
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: VIEW.W * RENDER_SCALE,
    height: VIEW.H * RENDER_SCALE,
  },
  scene: [BootScene, MenuScene, ProfileScene, PvpLobbyScene, StyleSelectScene, BattleScene, ResultScene],
});
