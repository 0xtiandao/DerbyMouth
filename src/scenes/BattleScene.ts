// src/scenes/BattleScene.ts — task 1.5 (UI) + 1.6 (chơi card).
// Scene CHỈ hiển thị + wire input — logic nằm trong core (CombatEngine/Inspiration/Style).
// Task 1.7: NPC brain. Task 1.8: win/lose thật (2 nút WIN/LOSE test sẽ bị xóa khi đó).
import Phaser from 'phaser';
import type {
  BattleSceneData,
  CardDef,
  CombatantState,
  ContentType,
  DamageBreakdown,
  ResultSceneData,
  Side,
  Style,
} from '../types';
import { BALANCE, CONTENT_COLORS, STYLE_LABELS } from '../core/constants';
import { VIEW } from '../core/view';
import { applySilence, createCombatant, isSilenced, resolveCardPlay } from '../core/CombatEngine';
import { InspirationSystem } from '../core/InspirationSystem';
import { StyleSystem } from '../core/StyleSystem';
import { cardsByStyle } from '../data/cards';
import { FALLBACK_ROASTS } from '../data/fallbackRoasts';
import { TEAMS } from '../data/teams';
import { SCENES } from './keys';
import { addText, makeTextButton, setupView } from './ui';
import {
  CardView,
  InspirationBubble,
  MfBar,
  SpeechBubble,
  StyleIndicator,
  StyleSwitchButton,
} from './battle/widgets';

const ALL_STYLES = Object.keys(STYLE_LABELS) as Style[];
const NPC_POS = { x: VIEW.W / 2, y: 250 } as const;

export class BattleScene extends Phaser.Scene {
  private playerStyle: Style = 'rebuttal';

  private player!: CombatantState;
  private opponent!: CombatantState;
  private inspiration!: Record<Side, InspirationSystem>;
  private styles!: StyleSystem;
  private matchEndAt = 0;
  private hand: CardDef[] = [];
  private lastRoast = '';

  private mfBarPlayer!: MfBar;
  private mfBarOpp!: MfBar;
  private bubble!: InspirationBubble;
  private stylePlayer!: StyleIndicator;
  private styleOpp!: StyleIndicator;
  private switchBtn!: StyleSwitchButton;
  private handViews: CardView[] = [];
  private timerText!: Phaser.GameObjects.Text;
  private playerBubble!: SpeechBubble;

  constructor() {
    super(SCENES.BATTLE);
  }

  init(data: BattleSceneData) {
    this.playerStyle = data.playerStyle ?? 'rebuttal';
  }

  create() {
    setupView(this);
    const now = this.time.now;

    // texture hạt particle dùng chung (placeholder — chấm tròn trắng, tint theo content)
    if (!this.textures.exists('spark')) {
      const g = this.make.graphics({ x: 0, y: 0 }, false);
      g.fillStyle(0xffffff, 1).fillCircle(4, 4, 4);
      g.generateTexture('spark', 8, 8);
      g.destroy();
    }

    // ----- state từ core (đội ngẫu nhiên 2 bên — profile chọn đội thật ở Phase 4) -----
    const [teamPlayer, teamOpp] = Phaser.Utils.Array.Shuffle([...TEAMS]).slice(0, 2);
    this.player = createCombatant(this.playerStyle, teamPlayer, now);
    this.opponent = createCombatant(Phaser.Utils.Array.GetRandom(ALL_STYLES), teamOpp, now);
    this.inspiration = {
      player: new InspirationSystem(this.player, now),
      opponent: new InspirationSystem(this.opponent, now),
    };
    this.styles = new StyleSystem({ player: this.player, opponent: this.opponent });
    this.matchEndAt = now + BALANCE.MATCH_TIMER_MS;
    this.lastRoast = '';

    // Hand đầu trận: 4 lá từ pool style đã chọn
    this.hand = Phaser.Utils.Array.Shuffle([...cardsByStyle(this.playerStyle)]).slice(
      0,
      BALANCE.HAND_SIZE,
    );

    // ----- NPC (trên) -----
    this.styleOpp = new StyleIndicator(this, 56, 50);
    addText(this, 40, 88, `${this.opponent.team.name} fan (NPC)`, {
      fontSize: '15px',
      color: '#cccccc',
    }).setOrigin(0, 0.5);
    this.mfBarOpp = new MfBar(this, 40, 118, 460, 20, 0xef4444);

    this.add.circle(NPC_POS.x, NPC_POS.y, 48, this.opponent.team.color).setStrokeStyle(3, 0xffffff, 0.4);
    addText(this, NPC_POS.x, NPC_POS.y + 62, this.opponent.team.name, {
      fontSize: '16px',
      color: '#aaaaaa',
    }).setOrigin(0.5);

    // ----- Timer góc phải trên -----
    this.timerText = addText(this, VIEW.W - 40, 40, '', {
      fontSize: '30px',
      color: '#fddb00',
      fontStyle: 'bold',
    }).setOrigin(1, 0.5);

    // ----- Player (dưới trái, NẰM TRÊN hand — hand chiếm từ y≈533 xuống) -----
    this.stylePlayer = new StyleIndicator(this, 56, 428);
    this.switchBtn = new StyleSwitchButton(this, 290, 428, (style) => {
      this.styles.switchTo('player', style, this.time.now);
    });
    addText(this, 40, 470, `${this.player.team.name} fan (you)`, {
      fontSize: '15px',
      color: '#cccccc',
    }).setOrigin(0, 0.5);
    this.mfBarPlayer = new MfBar(this, 40, 500, 460, 20, 0x22c55e);

    // ----- Speech bubble player (trái) -----
    this.playerBubble = new SpeechBubble(this, 330, 350, 'left');

    // ----- Hand 4 card -----
    this.handViews = this.hand.map((card, i) => {
      const view = new CardView(this, 100 + i * (CardView.W + 14), VIEW.H - CardView.H / 2 - 12);
      view.setCard(card);
      view.on('pointerdown', () => this.playCard(i));
      return view;
    });

    // ----- Inspiration bubble (dưới phải) -----
    this.bubble = new InspirationBubble(this, VIEW.W - 120, VIEW.H - 110);

    // ----- nút test win/lose (xóa ở task 1.8) -----
    makeTextButton(this, VIEW.W / 2 - 70, 28, 'WIN (test)', () => this.end(true), {
      width: 120, height: 32, fontSize: '13px',
    });
    makeTextButton(this, VIEW.W / 2 + 70, 28, 'LOSE (test)', () => this.end(false), {
      width: 120, height: 32, fontSize: '13px',
    });
  }

  update(time: number) {
    const now = time;
    this.inspiration.player.tick(now);
    this.inspiration.opponent.tick(now);

    this.mfBarPlayer.refresh(this.player.mf, this.player.mfMax);
    this.mfBarOpp.refresh(this.opponent.mf, this.opponent.mfMax);
    this.bubble.refresh(this.inspiration.player.value, this.inspiration.player.regenProgress(now));

    const adv = this.styles.advantage();
    this.stylePlayer.refresh(this.player.style, adv === 'player');
    this.styleOpp.refresh(this.opponent.style, adv === 'opponent');
    this.switchBtn.refresh(
      this.styles.cooldownProgress('player', now),
      this.styles.canSwitch('player', now),
      this.player.style,
    );

    const remainSec = Math.ceil(Math.max(0, this.matchEndAt - now) / 1000);
    this.timerText.setText(`${Math.floor(remainSec / 60)}:${String(remainSec % 60).padStart(2, '0')}`);

    this.handViews.forEach((view, i) => {
      const card = this.hand[i];
      if (card) view.setAffordable(this.inspiration.player.canAfford(card.cost));
    });
  }

  // ================= task 1.6: chơi card =================

  private playCard(slot: number) {
    const card = this.hand[slot];
    if (!card) return;
    const now = this.time.now;
    if (isSilenced(this.player, now)) return; // bị câm (Phase 2 NPC trash talk) — không chơi được

    // 1) check + trừ Inspiration. Thiếu → rung lá, không mất gì.
    if (!this.inspiration.player.spend(card.cost)) {
      this.shakeCard(this.handViews[slot]);
      return;
    }

    // 2) câu roast theo content type (Phase 2 thay bằng AI buffer, fallback giữ nguyên)
    this.playerBubble.show(this.pickRoast(card.content), CONTENT_COLORS[card.content]);
    this.burstParticles(330, 395, CONTENT_COLORS[card.content]);

    // 3) damage qua core: style buff + counter + combo + mark, trừ MF NPC
    const result = resolveCardPlay(card, this.player, this.opponent, now);
    this.showHitFeedback(result);

    // 4) effect tức thì core đã hỗ trợ (silence/recover/drain).
    //    Còn lại: shield/mark/slowRegen/costUp/buffNext → Phase 3; prompt/quiz → Phase 2.
    this.applyImmediateEffects(card, now);

    // 5) rút lá mới từ pool style HIỆN TẠI (sau switch là pool mới — card trên tay giữ nguyên)
    const drawn = this.drawCard(slot);
    this.hand[slot] = drawn;
    const view = this.handViews[slot];
    view.setCard(drawn);
    view.setScale(0.85);
    this.tweens.add({ targets: view, scale: 1, duration: 160, ease: 'Back.easeOut' });
  }

  private showHitFeedback(result: DamageBreakdown & { mfLoss: number }) {
    // jitter ngang để các con số không đè nhau khi đánh nhanh
    const jx = NPC_POS.x + Phaser.Math.Between(-50, 50);
    this.floatText(jx, 165, `-${result.mfLoss}`, '#ffffff', 0, '36px');
    if (result.countered) {
      const pct = Math.round((BALANCE.CONTENT_COUNTER_MULT - 1) * 100);
      this.floatText(NPC_POS.x, 205, `COUNTERED! +${pct}%`, '#fddb00', 120, '24px');
    }
    if (result.comboLevel >= 2) {
      this.floatText(NPC_POS.x, 240, `COMBO x${result.comboLevel}`, '#ff9f43', 240, '24px');
    }
    // đòn lớn → screen shake nhẹ ("Pub Knockout moment")
    if (result.countered || result.comboLevel === 3) {
      this.cameras.main.shake(130, 0.004);
    }
  }

  private applyImmediateEffects(card: CardDef, now: number) {
    for (const fx of card.effects) {
      switch (fx.kind) {
        case 'recoverInspiration': {
          const gained = this.inspiration.player.recover(fx.value ?? 0);
          if (gained > 0) this.floatText(VIEW.W - 120, VIEW.H - 170, `+${gained}`, '#6ee7ff', 0, '24px');
          break;
        }
        case 'drainInspiration': {
          const lost = this.inspiration.opponent.drain(fx.value ?? 0);
          if (lost > 0) this.floatText(NPC_POS.x + 90, NPC_POS.y - 20, `-${lost} INSP`, '#b48cff', 0, '18px');
          break;
        }
        case 'silence': {
          applySilence(this.opponent, fx.durationMs ?? 0, now);
          this.floatText(NPC_POS.x, NPC_POS.y - 80, 'SILENCED', '#9ca3af', 120, '22px');
          break;
        }
        default:
          break; // các effect khác xử lý ở Phase 2/3 theo roadmap
      }
    }
  }

  /** Rút lá từ pool style hiện tại, tránh trùng các lá đang cầm ở slot khác. */
  private drawCard(slot: number): CardDef {
    const pool = cardsByStyle(this.player.style);
    const inHand = new Set(this.hand.filter((_, i) => i !== slot).map((c) => c.id));
    const choices = pool.filter((c) => !inHand.has(c.id));
    return Phaser.Utils.Array.GetRandom(choices.length > 0 ? choices : pool);
  }

  /** Roast hardcode theo content type, né lặp câu liền trước, thay {OPP}/{MY}. */
  private pickRoast(content: ContentType): string {
    const pool = FALLBACK_ROASTS[content];
    let line = Phaser.Utils.Array.GetRandom(pool);
    if (line === this.lastRoast && pool.length > 1) {
      line = pool[(pool.indexOf(line) + 1) % pool.length];
    }
    this.lastRoast = line;
    return line.replaceAll('{OPP}', this.opponent.team.name).replaceAll('{MY}', this.player.team.name);
  }

  private floatText(x: number, y: number, str: string, color: string, delay = 0, fontSize = '26px') {
    const t = addText(this, x, y, str, { fontSize, color, fontStyle: 'bold' })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(20);
    this.tweens.add({
      targets: t, alpha: 1, y: y - 14, duration: 140, delay,
      onComplete: () => {
        this.tweens.add({
          targets: t, y: y - 48, alpha: 0, duration: 700, delay: 350,
          onComplete: () => t.destroy(),
        });
      },
    });
  }

  private burstParticles(x: number, y: number, tint: number) {
    const emitter = this.add.particles(x, y, 'spark', {
      speed: { min: 60, max: 180 },
      lifespan: 450,
      quantity: 14,
      scale: { start: 1, end: 0 },
      tint,
      emitting: false,
    });
    emitter.explode(14);
    this.time.delayedCall(600, () => emitter.destroy());
  }

  private shakeCard(view: CardView) {
    const x0 = view.x;
    this.tweens.add({
      targets: view, x: x0 + 7, duration: 45, yoyo: true, repeat: 3,
      onComplete: () => view.setX(x0),
    });
  }

  private end(won: boolean) {
    const data: ResultSceneData = { won };
    this.scene.start(SCENES.RESULT, data);
  }
}
