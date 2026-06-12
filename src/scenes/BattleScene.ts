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
  QuizQuestion,
  ResultSceneData,
  Side,
  Style,
} from '../types';
import { BALANCE, CONTENT_COLORS, CONTENT_LABELS, STYLE_LABELS } from '../core/constants';
import { VIEW } from '../core/view';
import {
  applyDamage,
  applyHeal,
  applySilence,
  createCombatant,
  effectiveCost,
  isSilenced,
  resolveCardPlay,
} from '../core/CombatEngine';
import { BeerChannel } from '../core/BeerChannel';
import { InspirationSystem } from '../core/InspirationSystem';
import { NpcBrain } from '../core/NpcBrain';
import { StyleSystem } from '../core/StyleSystem';
import { TrashTalkQTE } from '../core/TrashTalkQTE';
import type { QteKey } from '../core/TrashTalkQTE';
import { resolveNpcAnswer, shuffledAnswers } from '../core/quiz';
import { RoastBuffer } from '../api';
import { cardsByStyle } from '../data/cards';
import { TEAMS } from '../data/teams';
import { SCENES } from './keys';
import { addText, setupView } from './ui';
import {
  BanterLog,
  BeerButton,
  CardView,
  InspirationBubble,
  MfBar,
  SpeechBubble,
  StyleIndicator,
  StyleSwitchButton,
} from './battle/widgets';
import { QtePromptView, TrashTalkMenu } from './battle/qte';
import { QuizPanel } from './battle/quiz';

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
  private ending = false; // đã có bên thắng — đợi chuyển ResultScene
  private nextSuddenDrainAt = 0;
  private roastApi!: Record<Side, RoastBuffer>;
  private beer!: BeerChannel;
  private beerBtn!: BeerButton;
  private intentBadge: Phaser.GameObjects.Container | null = null; // R2 revealNext
  private matchSummary = { dmgDealt: 0, biggestHit: 0, quizStumped: 0 };

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
  private qte!: TrashTalkQTE;
  private qtePrompt!: QtePromptView;
  private ttMenu!: TrashTalkMenu;
  private npcAvatar!: Phaser.GameObjects.Arc;
  private quizPanel!: QuizPanel;
  private npcBadge: Phaser.GameObjects.Container | null = null;
  private pendingQuiz: QuizQuestion | null = null;

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
    this.nextSuddenDrainAt = this.matchEndAt; // drain đầu tiên đúng lúc 0:00
    this.ending = false;

    // AI buffer 2 chiều (task 2.4): nạp đầu trận, lấy 0ms, lỗi mạng → fallback
    this.roastApi = {
      player: new RoastBuffer(this.player.team, this.opponent.team),
      opponent: new RoastBuffer(this.opponent.team, this.player.team),
    };
    this.roastApi.player.primeRoasts();
    this.roastApi.player.primeTrashTalkAndQuiz(); // QTE/quiz chỉ phía player
    this.roastApi.opponent.primeRoasts();

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

    this.npcAvatar = this.add
      .circle(NPC_POS.x, NPC_POS.y, 48, this.opponent.team.color)
      .setStrokeStyle(3, 0xffffff, 0.4);
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

    // ----- Liquid Courage: nút bia cạnh nút switch -----
    this.beer = new BeerChannel(this.player);
    this.beerBtn = new BeerButton(this, 360, 428, () => this.tryDrink());
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

    // ----- NPC brain v2 (Phase 3): đọc bài player để counter/switch -----
    this.npcBrain = new NpcBrain(this.opponent, this.player, now);
    this.intentBadge = null;
    this.matchSummary = { dmgDealt: 0, biggestHit: 0, quizStumped: 0 };

    // ----- Trash Talk QTE (task 2.1) -----
    this.qte = new TrashTalkQTE(this.opponent, now);
    this.qtePrompt = new QtePromptView(this, (key) => this.onQtePress(key));
    this.ttMenu = new TrashTalkMenu(this);
    this.input.keyboard?.on('keydown-Q', () => this.onQtePress('Q'));
    this.input.keyboard?.on('keydown-E', () => this.onQtePress('E'));

    // ----- Quiz PVE (task 2.2) -----
    this.quizPanel = new QuizPanel(this);
    this.npcBadge = null;
    this.pendingQuiz = null;

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

  }

  update(time: number) {
    if (this.ending) return; // đóng băng trận trong khoảnh khắc KNOCKOUT
    const now = time;
    this.inspiration.player.tick(now);
    this.inspiration.opponent.tick(now);

    // Liquid Courage: uống xong → hồi máu
    const beerHealed = this.beer.tick(now);
    if (beerHealed > 0) {
      this.floatText(420, 470, `+${beerHealed} 🍺`, '#22c55e', 0, '26px');
    }
    this.beerBtn.refresh({
      ready: this.beer.canStart(now),
      cooldownProgress: this.beer.cooldownProgress(now),
      channeling: this.beer.isChanneling(),
      channelProgress: this.beer.channelProgress(now),
    });

    // NPC brain: thực thi quyết định (switch qua StyleSystem — tự enforce cooldown)
    for (const action of this.npcBrain.tick(now)) {
      if (action.kind === 'switch') this.styles.switchTo('opponent', action.style, now);
      else this.npcPlay(action.card, now);
    }

    // Trash Talk QTE: state machine ở core, scene chỉ render
    const qteEvent = this.qte.tick(now);
    if (qteEvent) {
      switch (qteEvent.kind) {
        case 'promptShown':
          this.qtePrompt.show(qteEvent.key);
          this.flashNpcBubble();
          break;
        case 'promptMissed':
          this.qtePrompt.hide();
          this.floatText(VIEW.W / 2, 420, 'MISSED', '#9ca3af', 0, '22px');
          break;
        case 'menuTimeout':
          this.ttMenu.hide();
          break;
      }
    }
    if (this.qte.currentPhase === 'prompt') this.qtePrompt.refreshRing(this.qte.promptProgress(now));
    if (this.qte.currentPhase === 'menu') this.ttMenu.refreshBar(this.qte.menuProgress(now));

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

    // Hết giờ → SUDDEN DEATH: drain MF cả 2 mỗi giây (xuyên shield), bù tick nếu frame trễ
    if (now >= this.matchEndAt) {
      this.timerText.setText('SUDDEN DEATH').setColor('#ef4444');
      this.timerText.setAlpha(0.6 + 0.4 * Math.abs(Math.sin(now / 200)));
      while (now >= this.nextSuddenDrainAt) {
        this.suddenDeathDrain();
        this.nextSuddenDrainAt += 1000;
      }
    } else {
      this.timerText.setText(this.clockLabel(now));
    }

    this.handViews.forEach((view, i) => {
      const card = this.hand[i];
      if (card) {
        const cost = effectiveCost(card, this.player, now);
        view.setAffordable(this.inspiration.player.canAfford(cost));
        view.refreshCost(cost, cost > card.cost);
      }
    });

    this.checkMatchEnd();
  }

  /** MF về 0 → KNOCKOUT + chuyển ResultScene. Cả 2 cùng 0 (drain sudden death) → player thắng. */
  private checkMatchEnd() {
    const playerDead = this.player.mf <= 0;
    const oppDead = this.opponent.mf <= 0;
    if (!playerDead && !oppDead) return;

    this.ending = true;
    const won = oppDead;
    this.floatText(VIEW.W / 2, 380, 'KNOCKOUT!', '#fddb00', 0, '52px');
    this.cameras.main.shake(250, 0.008);
    this.time.delayedCall(1200, () => this.end(won));
  }

  private suddenDeathDrain() {
    this.player.mf = Math.max(0, this.player.mf - BALANCE.SUDDEN_DEATH_DRAIN_PER_SEC);
    this.opponent.mf = Math.max(0, this.opponent.mf - BALANCE.SUDDEN_DEATH_DRAIN_PER_SEC);
    this.floatText(515, 100, `-${BALANCE.SUDDEN_DEATH_DRAIN_PER_SEC}`, '#ef4444', 0, '16px');
    this.floatText(515, 482, `-${BALANCE.SUDDEN_DEATH_DRAIN_PER_SEC}`, '#ef4444', 0, '16px');
  }

  // ================= task 1.6: chơi card =================

  private playCard(slot: number) {
    if (this.ending) return;
    const card = this.hand[slot];
    if (!card) return;
    const now = this.time.now;
    if (isSilenced(this.player, now)) {
      // bị câm (NPC trash talk Phase 2 / R3) — không chơi được
      this.floatText(HIT_POS.player.x, HIT_POS.player.y, 'SILENCED', '#9ca3af', 0, '20px');
      return;
    }
    if (this.beer.isChanneling()) {
      // đang uống bia — miệng bận, không chửi được
      this.floatText(360, 380, 'DRINKING...', '#9ca3af', 0, '18px');
      return;
    }

    // 1) check + trừ Inspiration (cost thực — F4 costUp có thể đội giá). Thiếu → rung lá.
    if (!this.inspiration.player.spend(effectiveCost(card, this.player, now))) {
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
    //    + Crowd Lifesteal (countered/combo x3 hồi máu)
    const result = resolveCardPlay(card, this.player, this.opponent, now);
    this.showHitFeedback(result, 'opponent');
    if (result.healed > 0) {
      this.floatText(420, 470, `+${result.healed}`, '#22c55e', 300, '24px');
    }
    this.matchSummary.dmgDealt += result.mfLoss;
    if (result.final > this.matchSummary.biggestHit) this.matchSummary.biggestHit = result.final;

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
    if (!this.inspiration.opponent.spend(effectiveCost(card, this.opponent, now))) return;
    this.clearIntentBadge(); // ý định đã thành đòn thật → badge reveal hết hiệu lực
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
    if (result.healed > 0) {
      this.floatText(520, 100, `+${result.healed}`, '#22c55e', 300, '24px');
    }

    // Liquid Courage: ăn đòn giữa lúc uống = sặc bia — mất heal + dính thêm % đòn đó
    if (this.beer.interrupt()) {
      const extra = Math.round((result.final * BALANCE.BEER_CHOKE_BONUS_PCT) / 100);
      applyDamage(this.player, extra);
      this.floatText(HIT_POS.player.x, HIT_POS.player.y - 42, 'CHOKED! 🍺', '#ef4444', 100, '28px');
      this.floatText(HIT_POS.player.x + 80, HIT_POS.player.y, `-${extra}`, '#ef4444', 220, '24px');
      this.cameras.main.shake(150, 0.006);
    }

    this.applyImmediateEffects(card, now, 'opponent');
  }

  /** Bắt đầu uống bia (Liquid Courage) — hở sườn 2s, sặc nếu ăn đòn. */
  private tryDrink() {
    if (this.ending) return;
    if (!this.beer.start(this.time.now)) return; // cooldown / đang uống
    this.floatText(360, 380, 'GLUG GLUG...', '#fddb00', 0, '18px');
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

  // ================= task 2.1: Trash Talk QTE =================

  private onQtePress(key: QteKey) {
    if (this.ending) return;
    if (this.beer.isChanneling()) return; // đang uống — không Q/E được
    const now = this.time.now;
    const result = this.qte.pressKey(key, now);
    if (result === 'ignored') return;
    this.qtePrompt.hide();
    if (result === 'wrongKey') {
      this.floatText(VIEW.W / 2, 420, 'WRONG KEY', '#ef4444', 0, '22px');
      return;
    }
    this.openTrashTalkMenu();
  }

  private openTrashTalkMenu() {
    // bộ 3 option từ AI buffer (task 2.4), rỗng → fallback. Kind: heavy/recover/silence.
    // DẠNG B (task 2.2): với TT_QUIZ_OPTION_CHANCE, slot heavy (risk cao) bị thay bằng QUIZ.
    const set = [...this.roastApi.player.nextTrashTalkSet().set];
    this.pendingQuiz = null;
    if (Math.random() < BALANCE.TT_QUIZ_OPTION_CHANCE) {
      this.pendingQuiz = this.roastApi.player.nextQuiz().quiz;
      set[0] = { text: `Pub quiz: "${this.pendingQuiz.q}"`, kind: 'quiz' };
    }

    const medium = Math.round((BALANCE.TT_STANDARD_HIT * BALANCE.TT_MEDIUM_DMG_PCT) / 100);
    const heavy = Math.round((BALANCE.TT_STANDARD_HIT * BALANCE.TT_HEAVY_DMG_PCT) / 100);
    const tagOf = (kind: string) =>
      kind === 'heavy' ? `DMG ${heavy}`
      : kind === 'recover' ? `DMG ${medium} · +${BALANCE.TT_RECOVER_INSPIRATION} INSP`
      : kind === 'silence' ? `DMG ${medium} · SILENCE`
      : `QUIZ · NPC sai = +${BALANCE.QUIZ_WRONG_BONUS_DMG}`;

    this.ttMenu.show(
      set.map((o) => ({ text: this.fillTeams(o.text), tag: tagOf(o.kind) })),
      (i) => this.onTrashTalkPick(set[i]),
    );
  }

  private onTrashTalkPick(option: { text: string; kind: string }) {
    const now = this.time.now;
    if (!this.qte.choose(now)) return; // menu đã timeout
    this.ttMenu.hide();
    const { kind } = option;

    // DẠNG B: quiz — risk/reward riêng, không phải đòn thường
    if (kind === 'quiz') {
      if (this.pendingQuiz) this.runQuiz(this.pendingQuiz, BALANCE.QUIZ_WRONG_BONUS_DMG);
      return;
    }

    // câu trash talk là lời player nói → bubble + banter log (accent vàng)
    const line = this.fillTeams(option.text);
    this.playerBubble.show(line, 0xfddb00);
    this.banterLog.push({
      side: 'player',
      name: 'You',
      time: this.clockLabel(now),
      line,
      accent: 0xfddb00,
      avatarColor: this.player.team.color,
    });
    this.burstParticles(330, 395, 0xfddb00);

    const pct = kind === 'heavy' ? BALANCE.TT_HEAVY_DMG_PCT : BALANCE.TT_MEDIUM_DMG_PCT;
    const dmg = Math.round((BALANCE.TT_STANDARD_HIT * pct) / 100);

    // trash talk là free damage: không tốn Inspiration, không đụng combo
    const { mfLoss } = applyDamage(this.opponent, dmg);
    this.matchSummary.dmgDealt += mfLoss;
    this.floatText(HIT_POS.opponent.x + Phaser.Math.Between(-50, 50), HIT_POS.opponent.y, `-${mfLoss}`, '#fddb00', 0, '36px');

    if (kind === 'recover') {
      const gained = this.inspiration.player.recover(BALANCE.TT_RECOVER_INSPIRATION);
      const p = this.fxPos('player');
      if (gained > 0) this.floatText(p.x, p.y, `+${gained} INSP`, '#6ee7ff', 120, '20px');
    } else if (kind === 'silence') {
      applySilence(this.opponent, BALANCE.TT_SILENCE_MS, now);
      this.floatText(NPC_POS.x, NPC_POS.y - 80, 'SILENCED', '#9ca3af', 120, '22px');
    } else {
      this.cameras.main.shake(130, 0.005); // heavy
    }

    // NPC "bối rối"
    this.tweens.add({ targets: this.npcAvatar, x: NPC_POS.x + 8, duration: 50, yoyo: true, repeat: 5 });
  }

  // ================= task 2.2: Quiz PVE =================

  /** Chạy 1 lượt quiz: player hỏi → NPC trả lời theo % độ khó.
   *  NPC sai = +bonusDmg + badge "fan nửa mùa" (kèm mark). NPC đúng = phản damage. */
  private runQuiz(quiz: QuizQuestion, bonusDmg: number) {
    const now = this.time.now;
    const npcName = `${this.opponent.team.name} fan`;
    const npcAns = resolveNpcAnswer(quiz);

    // player "hỏi" → bubble + log (quiz = đòn fan-shaming, accent xanh lá)
    const green = 0x22c55e;
    this.playerBubble.show(quiz.q, green);
    this.banterLog.push({
      side: 'player', name: 'You', time: this.clockLabel(now),
      line: quiz.q, accent: green, avatarColor: this.player.team.color,
    });

    this.quizPanel.run({
      question: quiz.q,
      answers: shuffledAnswers(quiz),
      npcAnswer: npcAns.answer,
      correctAnswer: quiz.correct,
      npcName,
      onReveal: (correct) => {
        const revealNow = this.time.now;
        this.banterLog.push({
          side: 'opponent', name: npcName, time: this.clockLabel(revealNow),
          line: npcAns.answer, accent: correct ? green : 0xef4444,
          avatarColor: this.opponent.team.color,
        });
        if (correct) {
          // NPC đúng → phản damage lại người hỏi
          const { mfLoss } = applyDamage(this.player, BALANCE.QUIZ_CORRECT_REFLECT_DMG);
          this.floatText(HIT_POS.player.x, HIT_POS.player.y, `-${mfLoss} REFLECT`, '#ef4444', 0, '26px');
        } else {
          // NPC sai → damage lớn + badge "fan nửa mùa" + mark (nhận thêm dmg)
          // + Crowd Lifesteal: nó quê = mày sướng → hồi máu
          const { mfLoss } = applyDamage(this.opponent, bonusDmg);
          this.matchSummary.dmgDealt += mfLoss;
          this.matchSummary.quizStumped++;
          this.floatText(HIT_POS.opponent.x, HIT_POS.opponent.y, `-${mfLoss}`, '#22c55e', 0, '36px');
          const healed = applyHeal(this.player, BALANCE.QUIZ_WRONG_HEAL);
          if (healed > 0) this.floatText(420, 470, `+${healed}`, '#22c55e', 300, '24px');
          this.opponent.marks.push({
            value: BALANCE.QUIZ_BADGE_MARK_VALUE,
            expiresAt: revealNow + BALANCE.QUIZ_BADGE_DURATION_MS,
          });
          this.showNpcBadge('🤡 PLASTIC FAN', BALANCE.QUIZ_BADGE_DURATION_MS);
          this.cameras.main.shake(130, 0.005);
        }
        this.tweens.add({ targets: this.npcAvatar, x: NPC_POS.x + 8, duration: 50, yoyo: true, repeat: 5 });
      },
      onDone: () => {},
    });
  }

  /** R2 Fact Check: hiện content type card NPC ĐỊNH đánh kế tiếp (tới khi NPC đánh). */
  private showNpcIntent() {
    const intent = this.npcBrain.nextIntent;
    if (!intent) {
      this.floatText(NPC_POS.x, NPC_POS.y - 80, 'NO READ', '#9ca3af', 120, '20px');
      return;
    }
    this.clearIntentBadge();
    const label = addText(this, 0, 0, `👁 NEXT: ${CONTENT_LABELS[intent.content]}`, {
      fontSize: '14px',
      color: '#1a120b',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    const bg = this.add
      .rectangle(0, 0, label.width + 18, 26, CONTENT_COLORS[intent.content], 1)
      .setStrokeStyle(2, 0xffffff, 0.6);
    this.intentBadge = this.add
      .container(NPC_POS.x + 150, NPC_POS.y - 40, [bg, label])
      .setDepth(6)
      .setScale(0);
    this.tweens.add({ targets: this.intentBadge, scale: 1, duration: 180, ease: 'Back.easeOut' });
  }

  private clearIntentBadge() {
    this.intentBadge?.destroy();
    this.intentBadge = null;
  }

  /** Badge nhục trên đầu NPC, tự biến mất sau durationMs. */
  private showNpcBadge(text: string, durationMs: number) {
    this.npcBadge?.destroy();
    const label = addText(this, 0, 0, text, {
      fontSize: '15px', color: '#1a120b', fontStyle: 'bold',
    }).setOrigin(0.5);
    const bg = this.add
      .rectangle(0, 0, label.width + 20, 28, 0xfddb00, 1)
      .setStrokeStyle(2, 0xef4444);
    const badge = this.add.container(NPC_POS.x, NPC_POS.y - 78, [bg, label]).setDepth(6);
    this.npcBadge = badge;
    badge.setScale(0);
    this.tweens.add({ targets: badge, scale: 1, duration: 200, ease: 'Back.easeOut' });
    this.time.delayedCall(durationMs, () => {
      if (this.npcBadge === badge) this.npcBadge = null;
      badge.destroy();
    });
  }

  /** NPC bubble flash khi prompt xuất hiện (nếu bubble đang hiện). */
  private flashNpcBubble() {
    if (!this.npcBubble.visible) return;
    this.tweens.add({ targets: this.npcBubble, alpha: 0.25, duration: 110, yoyo: true, repeat: 4 });
  }

  private fillTeams(text: string): string {
    return text
      .replaceAll('{OPP}', this.opponent.team.name)
      .replaceAll('{MY}', this.player.team.name);
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
        // Scholar (task 2.1) — chỉ phía player (NPC không có hệ QTE nhắm vào player)
        case 'promptChanceUp': {
          if (attacker !== 'player') break;
          this.qte.applyPromptChanceUp(fx.value ?? 0, fx.durationMs ?? 0, now);
          this.floatText(NPC_POS.x, NPC_POS.y - 80, `PROMPT +${fx.value}%`, '#fddb00', 120, '20px');
          break;
        }
        case 'npcMoodAnger': {
          if (attacker !== 'player') break;
          this.qte.applyAnger(now);
          this.floatText(NPC_POS.x, NPC_POS.y - 80, 'NPC TILTED', '#ff6b4a', 120, '20px');
          break;
        }
        // P5 Pub Quiz Challenge (task 2.2): ép mini-quiz ngay, value = bonus dmg nếu NPC sai
        case 'forceQuiz': {
          if (attacker !== 'player') break;
          const { quiz } = this.roastApi.player.nextQuiz();
          this.runQuiz(quiz, fx.value ?? BALANCE.QUIZ_WRONG_BONUS_DMG);
          break;
        }
        // ===== Phase 3: các effect còn lại =====
        case 'shield': { // F2 Wall of Text — buff BẢN THÂN: chặn dmg đòn kế nhận vào
          const self = attacker === 'player' ? this.player : this.opponent;
          self.shields += fx.value ?? 0;
          const p = this.fxPos(attacker);
          this.floatText(p.x, p.y, `SHIELD ${fx.value}`, '#60a5fa', 120, '20px');
          break;
        }
        case 'mark': { // P2 Plastic Fan Alert — victim nhận thêm % dmg
          victimState.marks.push({ value: fx.value ?? 0, expiresAt: now + (fx.durationMs ?? 0) });
          const p = HIT_POS[victim];
          this.floatText(p.x, p.y + 110, `MARKED +${fx.value}%`, '#f97316', 120, '20px');
          break;
        }
        case 'slowRegen': { // F1 Yap Storm — victim regen Inspiration chậm
          this.inspiration[victim].applySlowRegen(fx.value ?? 0, fx.durationMs ?? 0, now);
          const p = this.fxPos(victim);
          this.floatText(p.x, p.y, `REGEN -${fx.value}%`, '#b48cff', 120, '18px');
          break;
        }
        case 'costUp': { // F4 History Lesson — card victim cost +value
          victimState.costUpValue = fx.value ?? 0;
          victimState.costUpUntil = now + (fx.durationMs ?? 0);
          const p = this.fxPos(victim);
          this.floatText(p.x, p.y, `COST +${fx.value}`, '#b48cff', 120, '18px');
          break;
        }
        case 'buffNext': { // B2 Net Spend Flex — card kế của MÌNH +% dmg (one-shot)
          const self = attacker === 'player' ? this.player : this.opponent;
          self.nextCardBuffPct = fx.value ?? 0;
          const p = this.fxPos(attacker);
          this.floatText(p.x, p.y, `NEXT +${fx.value}%`, '#fddb00', 120, '18px');
          break;
        }
        case 'switchCooldownDown': { // P4 Bait & Switch — giảm cooldown switch của MÌNH
          const self = attacker === 'player' ? this.player : this.opponent;
          self.styleSwitchReadyAt = Math.max(now, self.styleSwitchReadyAt - (fx.value ?? 0));
          const p = this.fxPos(attacker);
          this.floatText(p.x, p.y, `SWITCH -${Math.round((fx.value ?? 0) / 1000)}s`, '#fddb00', 120, '18px');
          break;
        }
        case 'revealNext': { // R2 Fact Check — PVE: lộ content type card NPC ĐỊNH đánh
          if (attacker !== 'player') break;
          this.showNpcIntent();
          break;
        }
        default:
          break;
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

  /** Câu roast theo content type: AI buffer 0ms, rỗng → fallback hardcode (task 2.4).
   *  {OPP}/{MY} chỉ có trong fallback lines — replace vô hại với câu AI. */
  private pickRoast(content: ContentType, speaker: Side): string {
    const { text } = this.roastApi[speaker].nextRoast(content);
    const myTeam = speaker === 'player' ? this.player.team.name : this.opponent.team.name;
    const oppTeam = speaker === 'player' ? this.opponent.team.name : this.player.team.name;
    return text.replaceAll('{OPP}', oppTeam).replaceAll('{MY}', myTeam);
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
    const data: ResultSceneData = { won, summary: { ...this.matchSummary } };
    this.scene.start(SCENES.RESULT, data);
  }
}
