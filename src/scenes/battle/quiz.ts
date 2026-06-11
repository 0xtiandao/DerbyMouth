// src/scenes/battle/quiz.ts — UI quiz PVE (task 2.2). Logic ở core/quiz.ts.
// Timeline: hiện câu hỏi + 4 đáp án → NPC "suy nghĩ" → highlight đáp án NPC →
// reveal đúng/sai (gọi onReveal để scene áp damage) → tự đóng.
import Phaser from 'phaser';
import { BALANCE } from '../../core/constants';
import { addText } from '../ui';

export interface QuizRun {
  question: string;
  answers: string[]; // đã shuffle
  npcAnswer: string;
  correctAnswer: string;
  npcName: string;
  onReveal: (correct: boolean) => void;
  onDone: () => void;
}

const PANEL_W = 620;
const ANS_W = 290;
const ANS_H = 50;

export class QuizPanel extends Phaser.GameObjects.Container {
  private items: { bg: Phaser.GameObjects.Rectangle; label: Phaser.GameObjects.Text; answer: string }[] = [];
  private parts: Phaser.GameObjects.GameObject[] = [];

  constructor(scene: Phaser.Scene) {
    super(scene, 640, 300);
    this.setDepth(32);
    this.setVisible(false);
    scene.add.existing(this);
  }

  run(data: QuizRun) {
    this.clearParts();
    const scene = this.scene;

    const qText = addText(scene, 0, -86, data.question, {
      fontSize: '17px',
      color: '#fff8ee',
      fontStyle: 'bold',
      align: 'center',
      wordWrap: { width: PANEL_W - 60 },
    }).setOrigin(0.5);

    const panelH = qText.height + 200;
    const bg = scene.add
      .rectangle(0, 0, PANEL_W, panelH, 0x1a1208, 0.97)
      .setStrokeStyle(2, 0x22c55e, 0.9); // viền xanh fan-shaming — quiz là đòn fan-shaming
    const status = addText(scene, 0, -panelH / 2 + 20, `PUB QUIZ — ${data.npcName} is thinking...`, {
      fontSize: '12px',
      color: '#9a8c7a',
    }).setOrigin(0.5);

    this.items = data.answers.map((answer, i) => {
      const col = i % 2 === 0 ? -1 : 1;
      const row = i < 2 ? 0 : 1;
      const x = col * (ANS_W / 2 + 10);
      const y = 10 + row * (ANS_H + 14);
      const itemBg = scene.add
        .rectangle(x, y, ANS_W, ANS_H, 0x26201a, 0.97)
        .setStrokeStyle(1.5, 0xffffff, 0.25);
      const label = addText(scene, x, y, answer, {
        fontSize: '14px',
        color: '#e8e2d8',
        align: 'center',
        wordWrap: { width: ANS_W - 20 },
      }).setOrigin(0.5);
      return { bg: itemBg, label, answer };
    });

    this.parts = [bg, qText, status, ...this.items.flatMap((it) => [it.bg, it.label])];
    this.add(this.parts);
    this.setVisible(true);
    this.setScale(0.8);
    scene.tweens.add({ targets: this, scale: 1, duration: 180, ease: 'Back.easeOut' });

    // NPC suy nghĩ → highlight lựa chọn
    scene.time.delayedCall(BALANCE.QUIZ_THINK_MS, () => {
      const picked = this.items.find((it) => it.answer === data.npcAnswer);
      picked?.bg.setStrokeStyle(3, 0xfddb00, 1);
      status.setText(`${data.npcName} answers...`);

      // reveal sau 1 nhịp
      scene.time.delayedCall(800, () => {
        const correct = data.npcAnswer === data.correctAnswer;
        for (const it of this.items) {
          if (it.answer === data.correctAnswer) {
            it.bg.setFillStyle(0x14532d, 1).setStrokeStyle(3, 0x22c55e, 1); // đúng = xanh
          } else if (it.answer === data.npcAnswer) {
            it.bg.setFillStyle(0x7f1d1d, 1).setStrokeStyle(3, 0xef4444, 1); // NPC sai = đỏ
          }
        }
        status.setText(correct ? `${data.npcName} got it right!` : `${data.npcName} has NO idea!`);
        data.onReveal(correct);

        scene.time.delayedCall(1600, () => {
          this.setVisible(false);
          this.clearParts();
          data.onDone();
        });
      });
    });
  }

  private clearParts() {
    this.parts.forEach((p) => p.destroy());
    this.parts = [];
    this.items = [];
  }
}
