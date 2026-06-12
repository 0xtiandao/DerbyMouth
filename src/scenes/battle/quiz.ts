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

  /** PVP (Phase 4.2): MÌNH bị hỏi — tự bấm đáp án trong deadlineMs, hết giờ = trả lời sai.
   *  onAnswer(answer | null khi timeout) gọi đúng 1 lần, panel tự reveal màu rồi đóng. */
  runAnswer(data: {
    question: string;
    answers: string[];
    correctAnswer: string;
    deadlineMs: number;
    onAnswer: (answer: string | null) => void;
  }) {
    this.clearParts();
    const scene = this.scene;
    let answered = false;

    const qText = addText(scene, 0, -86, data.question, {
      fontSize: '17px', color: '#fff8ee', fontStyle: 'bold', align: 'center',
      wordWrap: { width: PANEL_W - 60 },
    }).setOrigin(0.5);
    const panelH = qText.height + 200;
    const bg = scene.add
      .rectangle(0, 0, PANEL_W, panelH, 0x1a1208, 0.97)
      .setStrokeStyle(2, 0xef4444, 0.9); // viền đỏ — MÌNH đang bị quay
    const status = addText(scene, 0, -panelH / 2 + 20, 'POP QUIZ — answer or eat damage!', {
      fontSize: '12px', color: '#ef4444', fontStyle: 'bold',
    }).setOrigin(0.5);
    const timerBar = scene.add.rectangle(0, panelH / 2 - 8, PANEL_W - 20, 6, 0xef4444).setOrigin(0.5);

    const finish = (answer: string | null) => {
      if (answered) return;
      answered = true;
      for (const it of this.items) {
        it.bg.disableInteractive();
        if (it.answer === data.correctAnswer) {
          it.bg.setFillStyle(0x14532d, 1).setStrokeStyle(3, 0x22c55e, 1);
        } else if (answer !== null && it.answer === answer) {
          it.bg.setFillStyle(0x7f1d1d, 1).setStrokeStyle(3, 0xef4444, 1);
        }
      }
      status.setText(answer === data.correctAnswer ? 'Correct!' : answer === null ? 'TIME UP!' : 'WRONG!');
      data.onAnswer(answer);
      scene.time.delayedCall(1400, () => {
        this.setVisible(false);
        this.clearParts();
      });
    };

    this.items = data.answers.map((answer, i) => {
      const col = i % 2 === 0 ? -1 : 1;
      const row = i < 2 ? 0 : 1;
      const x = col * (ANS_W / 2 + 10);
      const y = 10 + row * (ANS_H + 14);
      const itemBg = scene.add
        .rectangle(x, y, ANS_W, ANS_H, 0x26201a, 0.97)
        .setStrokeStyle(1.5, 0xffffff, 0.25);
      const label = addText(scene, x, y, answer, {
        fontSize: '14px', color: '#e8e2d8', align: 'center',
        wordWrap: { width: ANS_W - 20 },
      }).setOrigin(0.5);
      itemBg.setInteractive({ useHandCursor: true });
      itemBg.on('pointerover', () => itemBg.setFillStyle(0x3a3026, 0.97));
      itemBg.on('pointerdown', () => finish(answer));
      return { bg: itemBg, label, answer };
    });

    this.parts = [bg, qText, status, timerBar, ...this.items.flatMap((it) => [it.bg, it.label])];
    this.add(this.parts);
    this.setVisible(true);
    this.setScale(0.85);
    scene.tweens.add({ targets: this, scale: 1, duration: 180, ease: 'Back.easeOut' });

    // thanh thời gian co dần — hết giờ = sai
    scene.tweens.add({
      targets: timerBar, scaleX: 0, duration: data.deadlineMs,
      onComplete: () => finish(null),
    });
  }
}
