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
import { NpcBrain } from '../core/NpcBrain';
import { StyleSystem } from '../core/StyleSystem';
import { cardsByStyle } from '../data/cards';
import { FALLBACK_ROASTS } from '../data/fallbackRoasts';
import { TEAMS } from '../data/teams';
import { SCENES } from './keys';
import { addText, makeTextButton, setupView } from './ui';
import {
  BanterLog,
  CardView,
  InspirationBubble,
  MfBar,
  SpeechBubble,
  StyleIndicator,
  StyleSwitchButton,
} from './battle/widgets';

const ALL_STYLES = Object.keys(STYLE_LABELS) as Style[];
const NPC_POS = { x: VIEW.W / 2, y: 250 } as const;
/** Vị trí hiện damage float khi bên đó BỊ đánh */
const HIT_POS: Record<Side, { x: number; y: number }> = {
  opponent: { x: NPC_POS.x, y: 165 },
  player: { x: 270, y: 445 },
};

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
  private npcBubble!: SpeechBubble;
  private npcBrain!: NpcBrain;
  private banterLog!: BanterLog;

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

    // ----- Speech bubble 2 bên (player trái, NPC trên avatar — nhường chỗ banter log) -----
    this.playerBubble = new SpeechBubble(this, 330, 350, 'left');
    this.npcBubble = new SpeechBubble(this, 660, 150, 'left');

    // ----- Banter log: lịch sử hội thoại kiểu chat, bên phải dưới timer -----
    this.banterLog = new BanterLog(this, 920, 72, 330, 470);

    // ----- NPC brain v1 (task 1.7) -----
    this.npcBrain = new NpcBrain(this.opponent, now);

    // float thông báo khi 1 bên đổi style (nghe event từ StyleSystem)
    this.styles.onSwitch((e) => {
      const pos = e.side === 'player'
        ? { x: 170, y: 392 }
        : { x: NPC_POS.x, y: NPC_POS.y - 95 };
      this.floatText(pos.x, pos.y, `→ ${STYLE_LABELS[e.to]}`, '#ffffff', 0, '20px');
    });

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

    // NPC brain: thực thi quyết định (switch qua StyleSystem — tự enforce cooldown)
    for (const action of this.npcBrain.tick(now)) {
      if (action.kind === 'switch') this.styles.switchTo('opponent', action.style, now);
      else this.npcPlay(action.card, now);
    }

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

    this.timerText.setText(this.clockLabel(now));

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
    if (isSilenced(this.player, now)) {
      // bị câm (NPC trash talk Phase 2 / R3) — không chơi được
      this.floatText(HIT_POS.player.x, HIT_POS.player.y, 'SILENCED', '#9ca3af', 0, '20px');
      return;
    }

    // 1) check + trừ Inspiration. Thiếu → rung lá, không mất gì.
    if (!this.inspiration.player.spend(card.cost)) {
      this.shakeCard(this.handViews[slot]);
      return;
    }

    // 2) câu roast theo content type (Phase 2 thay bằng AI buffer, fallback giữ nguyên)
    const line = this.pickRoast(card.content, 'player');
    this.playerBubble.show(line, CONTENT_COLORS[card.content]);
    this.banterLog.push({
      side: 'player',
      name: 'You',
      time: this.clockLabel(now),
      line,
      accent: CONTENT_COLORS[card.content],
      avatarColor: this.player.team.color,
    });
    this.burstParticles(330, 395, CONTENT_COLORS[card.content]);

    // 3) damage qua core: style buff + counter + combo + mark, trừ MF NPC
    const result = resolveCardPlay(card, this.player, this.opponent, now);
    this.showHitFeedback(result, 'opponent');

    // 4) effect tức thì core đã hỗ trợ (silence/recover/drain).
    //    Còn lại: shield/mark/slowRegen/costUp/buffNext → Phase 3; prompt/quiz → Phase 2.
    this.applyImmediateEffects(card, now, 'player');

    // 5) rút lá mới từ pool style HIỆN TẠI (sau switch là pool mới — card trên tay giữ nguyên)
    const drawn = this.drawCard(slot);
    this.hand[slot] = drawn;
    const view = this.handViews[slot];
    view.setCard(drawn);
    view.setScale(0.85);
    this.tweens.add({ targets: view, scale: 1, duration: 160, ease: 'Back.easeOut' });
  }

  /** NPC chơi card (task 1.7): bubble phải + trừ MF player — cùng đường core với player. */
  private npcPlay(card: CardDef, now: number) {
    if (!this.inspiration.opponent.spend(card.cost)) return; // brain đọc state cũ — bỏ lượt
    const line = this.pickRoast(card.content, 'opponent');
    this.npcBubble.show(line, CONTENT_COLORS[card.content]);
    this.banterLog.push({
      side: 'opponent',
      name: `${this.opponent.team.name} fan`,
      time: this.clockLabel(now),
      line,
      accent: CONTENT_COLORS[card.content],
      avatarColor: this.opponent.team.color,
    });
    this.burstParticles(660, 190, CONTENT_COLORS[card.content]);

    const result = resolveCardPlay(card, this.opponent, this.player, now);
    this.showHitFeedback(result, 'player');
    this.applyImmediateEffects(card, now, 'opponent');
  }

  private showHitFeedback(result: DamageBreakdown & { mfLoss: number }, victim: Side) {
    const pos = HIT_POS[victim];
    // jitter ngang để các con số không đè nhau khi đánh nhanh
    const jx = pos.x + Phaser.Math.Between(-50, 50);
    this.floatText(jx, pos.y, `-${result.mfLoss}`, '#ffffff', 0, '36px');
    if (result.countered) {
      const pct = Math.round((BALANCE.CONTENT_COUNTER_MULT - 1) * 100);
      this.floatText(pos.x, pos.y + 40, `COUNTERED! +${pct}%`, '#fddb00', 120, '24px');
    }
    if (result.comboLevel >= 2) {
      this.floatText(pos.x, pos.y + 75, `COMBO x${result.comboLevel}`, '#ff9f43', 240, '24px');
    }
    // đòn lớn → screen shake nhẹ ("Pub Knockout moment")
    if (result.countered || result.comboLevel === 3) {
      this.cameras.main.shake(130, 0.004);
    }
  }

  /** Vị trí float text effect phụ của mỗi bên (inspiration recover/drain...). */
  private fxPos(side: Side): { x: number; y: number } {
    return side === 'player'
      ? { x: VIEW.W - 120, y: VIEW.H - 170 } // cạnh inspiration bubble
      : { x: NPC_POS.x + 90, y: NPC_POS.y - 20 }; // cạnh avatar NPC
  }

  private applyImmediateEffects(card: CardDef, now: number, attacker: Side) {
    const victim: Side = attacker === 'player' ? 'opponent' : 'player';
    const victimState = victim === 'player' ? this.player : this.opponent;
    for (const fx of card.effects) {
      switch (fx.kind) {
        case 'recoverInspiration': {
          const gained = this.inspiration[attacker].recover(fx.value ?? 0);
          const p = this.fxPos(attacker);
          if (gained > 0) this.floatText(p.x, p.y, `+${gained} INSP`, '#6ee7ff', 0, '20px');
          break;
        }
        case 'drainInspiration': {
          const lost = this.inspiration[victim].drain(fx.value ?? 0);
          const p = this.fxPos(victim);
          if (lost > 0) this.floatText(p.x, p.y, `-${lost} INSP`, '#b48cff', 0, '20px');
          break;
        }
        case 'silence': {
          applySilence(victimState, fx.durationMs ?? 0, now);
          const p = HIT_POS[victim];
          this.floatText(p.x, p.y + 110, 'SILENCED', '#9ca3af', 120, '22px');
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

  /** Roast hardcode theo content type, né lặp câu liền trước, thay {OPP}/{MY} theo người nói. */
  private pickRoast(content: ContentType, speaker: Side): string {
    const pool = FALLBACK_ROASTS[content];
    let line = Phaser.Utils.Array.GetRandom(pool);
    if (line === this.lastRoast && pool.length > 1) {
      line = pool[(pool.indexOf(line) + 1) % pool.length];
    }
    this.lastRoast = line;
    const myTeam = speaker === 'player' ? this.player.team.name : this.opponent.team.name;
    const oppTeam = speaker === 'player' ? this.opponent.team.name : this.player.team.name;
    return line.replaceAll('{OPP}', oppTeam).replaceAll('{MY}', myTeam);
  }

  /** Đồng hồ trận (đếm ngược) — dùng cho timer + mốc giờ trong banter log. */
  private clockLabel(now: number): string {
    const remainSec = Math.ceil(Math.max(0, this.matchEndAt - now) / 1000);
    return `${Math.floor(remainSec / 60)}:${String(remainSec % 60).padStart(2, '0')}`;
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
