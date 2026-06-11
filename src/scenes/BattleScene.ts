// src/scenes/BattleScene.ts — task 1.5: dựng UI battle (placeholder graphics).
// Scene CHỈ hiển thị — state/logic nằm trong core (CombatEngine/InspirationSystem/StyleSystem).
// Task 1.6: tap card chơi bài + speech bubble. Task 1.7: NPC brain. Task 1.8: win/lose thật
// (2 nút WIN/LOSE test ở góc trên sẽ bị xóa khi đó).
import Phaser from 'phaser';
import type { BattleSceneData, CardDef, CombatantState, ResultSceneData, Side, Style } from '../types';
import { BALANCE, STYLE_LABELS } from '../core/constants';
import { VIEW } from '../core/view';
import { createCombatant } from '../core/CombatEngine';
import { InspirationSystem } from '../core/InspirationSystem';
import { StyleSystem } from '../core/StyleSystem';
import { cardsByStyle } from '../data/cards';
import { TEAMS } from '../data/teams';
import { SCENES } from './keys';
import { addText, makeTextButton, setupView } from './ui';
import {
  CardView,
  InspirationBubble,
  MfBar,
  StyleIndicator,
  StyleSwitchButton,
} from './battle/widgets';

const ALL_STYLES = Object.keys(STYLE_LABELS) as Style[];

export class BattleScene extends Phaser.Scene {
  private playerStyle: Style = 'rebuttal';

  private player!: CombatantState;
  private opponent!: CombatantState;
  private inspiration!: Record<Side, InspirationSystem>;
  private styles!: StyleSystem;
  private matchEndAt = 0;
  private hand: CardDef[] = [];

  private mfBarPlayer!: MfBar;
  private mfBarOpp!: MfBar;
  private bubble!: InspirationBubble;
  private stylePlayer!: StyleIndicator;
  private styleOpp!: StyleIndicator;
  private switchBtn!: StyleSwitchButton;
  private handViews: CardView[] = [];
  private timerText!: Phaser.GameObjects.Text;

  constructor() {
    super(SCENES.BATTLE);
  }

  init(data: BattleSceneData) {
    this.playerStyle = data.playerStyle ?? 'rebuttal';
  }

  create() {
    setupView(this);
    const now = this.time.now;

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

    // Hand đầu trận: 4 lá từ pool style đã chọn (rút lá mới khi chơi = task 1.6)
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

    // avatar NPC placeholder giữa màn
    this.add.circle(VIEW.W / 2, 250, 48, this.opponent.team.color).setStrokeStyle(3, 0xffffff, 0.4);
    addText(this, VIEW.W / 2, 312, this.opponent.team.name, {
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

    // ----- Hand 4 card -----
    this.handViews = this.hand.map((card, i) => {
      const view = new CardView(this, 100 + i * (CardView.W + 14), VIEW.H - CardView.H / 2 - 12);
      view.setCard(card);
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

  private end(won: boolean) {
    const data: ResultSceneData = { won };
    this.scene.start(SCENES.RESULT, data);
  }
}
