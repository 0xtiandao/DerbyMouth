// src/scenes/ProfileScene.ts — Phase 4: chọn đội (bắt buộc cho Fan-Shaming/quiz đúng đội)
// + connect wallet EVM (SIWE-lite) + xem stats on-record (D1).
// Guest vẫn chơi được — chỉ không có stats on-record.
import Phaser from 'phaser';
import { TEAMS } from '../data/teams';
import { VIEW } from '../core/view';
import { loadProfile, saveProfile, fetchRemoteProfile, saveRemoteTeam } from '../profile';
import { connectWallet, hasWallet, loadSession } from '../wallet';
import type { WalletSession } from '../wallet';
import { SCENES } from './keys';
import { addText, makeTextButton, setupView } from './ui';

const GRID_COLS = 7;

export class ProfileScene extends Phaser.Scene {
  private session: WalletSession | null = null;
  private ring!: Phaser.GameObjects.Arc;
  private walletText!: Phaser.GameObjects.Text;
  private statsText!: Phaser.GameObjects.Text;
  private teamPos = new Map<string, { x: number; y: number }>();

  constructor() {
    super(SCENES.PROFILE);
  }

  create() {
    setupView(this);
    this.session = loadSession();

    addText(this, VIEW.W / 2, 48, 'YOUR PROFILE', {
      fontSize: '40px',
      color: '#fddb00',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    addText(this, VIEW.W / 2, 96, 'Pick your team — AI roasts and quizzes use it', {
      fontSize: '15px',
      color: '#9a8c7a',
    }).setOrigin(0.5);

    // ----- vòng highlight đội đang chọn -----
    this.ring = this.add.circle(0, 0, 40).setStrokeStyle(4, 0xfddb00).setVisible(false);

    // ----- grid đội (teams.ts) -----
    const profile = loadProfile();
    TEAMS.forEach((team, i) => {
      const col = i % GRID_COLS;
      const row = Math.floor(i / GRID_COLS);
      const x = 190 + col * 150;
      const y = 200 + row * 150;
      this.teamPos.set(team.id, { x, y });

      const c = this.add.circle(x, y, 32, team.color).setStrokeStyle(2, 0xffffff, 0.5);
      addText(this, x, y + 50, team.name, { fontSize: '13px', color: '#cccccc' }).setOrigin(0.5);
      c.setInteractive({ useHandCursor: true });
      c.on('pointerover', () => c.setScale(1.12));
      c.on('pointerout', () => c.setScale(1));
      c.on('pointerdown', () => this.selectTeam(team.id));
    });
    if (profile.teamId) this.moveRing(profile.teamId);

    // ----- wallet -----
    this.walletText = addText(this, VIEW.W / 2, 520, '', { fontSize: '15px', color: '#9a8c7a' })
      .setOrigin(0.5);
    if (this.session) {
      this.showConnected();
    } else if (hasWallet()) {
      this.walletText.setText('Connect wallet to keep stats on-record (sign only, no transaction)');
      makeTextButton(this, VIEW.W / 2, 575, 'CONNECT WALLET', () => this.doConnect(), {
        width: 260, height: 48, fontSize: '18px',
      });
    } else {
      this.walletText.setText('MetaMask not detected — playing as guest (stats stay on this device)');
    }

    this.statsText = addText(this, VIEW.W / 2, 625, '', { fontSize: '15px', color: '#9a8c7a' })
      .setOrigin(0.5);
    if (this.session) void this.refreshRemote();

    makeTextButton(this, VIEW.W / 2, VIEW.H - 40, 'BACK', () => this.scene.start(SCENES.MENU), {
      width: 180, height: 48, fontSize: '18px',
    });
  }

  private selectTeam(teamId: string) {
    saveProfile({ teamId });
    this.moveRing(teamId);
    if (this.session) void saveRemoteTeam(this.session, teamId);
  }

  private moveRing(teamId: string) {
    const pos = this.teamPos.get(teamId);
    if (!pos) return;
    this.ring.setPosition(pos.x, pos.y).setVisible(true);
  }

  private async doConnect() {
    try {
      this.walletText.setText('Check MetaMask — sign the login message...');
      this.session = await connectWallet();
      this.showConnected();
      // ví đã có team trên D1 mà local chưa chọn → kéo về; local có → đẩy lên
      await this.refreshRemote();
      const local = loadProfile();
      if (local.teamId) void saveRemoteTeam(this.session, local.teamId);
    } catch (err) {
      this.walletText.setText(`Wallet connect failed: ${String(err)}`);
    }
  }

  private showConnected() {
    if (!this.session) return;
    const a = this.session.address;
    this.walletText.setText(`Wallet: ${a.slice(0, 6)}…${a.slice(-4)} ✓ (stats on-record)`);
  }

  private async refreshRemote() {
    if (!this.session) return;
    const remote = await fetchRemoteProfile(this.session);
    if (!remote) return;
    if (remote.team_id && !loadProfile().teamId) {
      saveProfile({ teamId: remote.team_id });
      this.moveRing(remote.team_id);
    }
    this.statsText.setText(
      `On-record: ${remote.wins}W - ${remote.losses}L · streak ${remote.streak} (best ${remote.best_streak}) · quiz stumped ${remote.quiz_stumped}`,
    );
  }
}
