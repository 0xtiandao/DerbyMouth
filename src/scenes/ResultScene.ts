// src/scenes/ResultScene.ts — task 1.2 + Phase 3: reward screen (tóm tắt trận + local stats).
import Phaser from 'phaser';
import type { ResultSceneData } from '../types';
import { VIEW } from '../core/view';
import { recordMatch } from '../stats';
import { postMatchResult } from '../profile';
import { loadSession } from '../wallet';
import { sfx } from '../audio';
import { SCENES } from './keys';
import { addText, makeTextButton, setupView } from './ui';

export class ResultScene extends Phaser.Scene {
  private won = false;
  private summary: ResultSceneData['summary'];

  constructor() {
    super(SCENES.RESULT);
  }

  init(data: ResultSceneData) {
    this.won = data.won ?? false;
    this.summary = data.summary;
  }

  create() {
    setupView(this);
    this.time.delayedCall(150, () => sfx.play(this.won ? 'win' : 'lose'));
    const stats = recordMatch(this.won); // ghi localStorage 1 lần mỗi trận

    // có wallet session → đẩy kết quả lên D1 (stats on-record, fire-and-forget)
    const session = loadSession();
    if (session) void postMatchResult(session, this.won, this.summary?.quizStumped ?? 0);

    addText(this, VIEW.W / 2, VIEW.H * 0.22, this.won ? 'YOU WIN' : 'YOU LOSE', {
      fontSize: '84px',
      color: this.won ? '#22c55e' : '#ef4444',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    addText(
      this,
      VIEW.W / 2,
      VIEW.H * 0.22 + 70,
      this.won ? 'opponent has left the pub' : 'practice your banter and come back',
      { fontSize: '20px', color: '#cccccc' },
    ).setOrigin(0.5);

    // ----- tóm tắt trận (reward screen) -----
    if (this.summary) {
      const panel = this.add
        .rectangle(VIEW.W / 2, VIEW.H * 0.47, 560, 96, 0x000000, 0.35)
        .setStrokeStyle(1, 0xffffff, 0.18);
      addText(this, VIEW.W / 2, panel.y - 26, 'MATCH SUMMARY', {
        fontSize: '13px',
        color: '#776655',
        fontStyle: 'bold',
      }).setOrigin(0.5);
      addText(
        this,
        VIEW.W / 2,
        panel.y + 10,
        `Damage dealt: ${this.summary.dmgDealt}   ·   Biggest hit: ${this.summary.biggestHit}` +
          `   ·   Quiz stumped: ${this.summary.quizStumped}`,
        { fontSize: '17px', color: '#fff8ee' },
      ).setOrigin(0.5);
    }

    // ----- lifetime stats (localStorage) -----
    const streakNote = stats.streak > 1 ? `  🔥 ${stats.streak} win streak!` : '';
    addText(
      this,
      VIEW.W / 2,
      VIEW.H * 0.58,
      `Record: ${stats.wins}W - ${stats.losses}L (${stats.matches} matches)` +
        `   ·   Best streak: ${stats.bestStreak}${streakNote}`,
      { fontSize: '15px', color: '#9a8c7a' },
    ).setOrigin(0.5);

    makeTextButton(this, VIEW.W / 2, VIEW.H * 0.7, 'PLAY AGAIN', () => {
      this.scene.start(SCENES.STYLE_SELECT);
    });

    makeTextButton(
      this,
      VIEW.W / 2,
      VIEW.H * 0.7 + 92,
      'MENU',
      () => this.scene.start(SCENES.MENU),
      { width: 200, height: 52, fontSize: '20px' },
    );
  }
}
