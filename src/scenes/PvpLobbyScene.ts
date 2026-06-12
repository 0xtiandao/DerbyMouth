// src/scenes/PvpLobbyScene.ts — Phase 4.2: phòng PVP qua PeerJS room code.
// HOST: tạo code 5 chữ, chờ. JOIN: nhập code (window.prompt — placeholder tới khi có UI nhập chữ).
// Cả 2 connected (đã trao đổi hello/team) → StyleSelect chế độ pvp.
import Phaser from 'phaser';
import { TEAMS, teamById } from '../data/teams';
import { VIEW } from '../core/view';
import { loadProfile } from '../profile';
import { PvpLink, setActiveLink } from '../pvp/PvpLink';
import { SCENES } from './keys';
import { addText, makeTextButton, setupView } from './ui';

export class PvpLobbyScene extends Phaser.Scene {
  private statusText!: Phaser.GameObjects.Text;
  private link: PvpLink | null = null;

  constructor() {
    super(SCENES.PVP_LOBBY);
  }

  create() {
    setupView(this);

    addText(this, VIEW.W / 2, 60, 'PVP — PUB DERBY', {
      fontSize: '40px', color: '#fddb00', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.statusText = addText(this, VIEW.W / 2, 360, 'Host a room or join with a code', {
      fontSize: '18px', color: '#cccccc', align: 'center',
    }).setOrigin(0.5);

    makeTextButton(this, VIEW.W / 2 - 160, 220, 'HOST ROOM', () => this.doHost(), { width: 260 });
    makeTextButton(this, VIEW.W / 2 + 160, 220, 'JOIN ROOM', () => this.doJoin(), { width: 260 });

    makeTextButton(this, VIEW.W / 2, VIEW.H - 50, 'BACK', () => {
      setActiveLink(null);
      this.scene.start(SCENES.MENU);
    }, { width: 180, height: 48, fontSize: '18px' });
  }

  /** Đội của mình: profile đã chọn, chưa có thì random (không lưu). */
  private myTeamId(): string {
    return teamById(loadProfile().teamId ?? '')?.id
      ?? TEAMS[Math.floor(Math.random() * TEAMS.length)].id;
  }

  private doHost() {
    const code = PvpLink.makeCode();
    this.link = new PvpLink(this.myTeamId());
    setActiveLink(this.link);
    this.wireStatus();
    this.link.host(code);
    console.log(`[pvp] room code: ${code}`);
    this.statusText.setText(`ROOM CODE: ${code}\nShare it — waiting for opponent...`);
  }

  private doJoin() {
    const code = window.prompt('Room code (5 letters)?')?.trim().toUpperCase();
    if (!code) return;
    this.link = new PvpLink(this.myTeamId());
    setActiveLink(this.link);
    this.wireStatus();
    this.link.join(code);
    this.statusText.setText(`Joining room ${code}...`);
  }

  private wireStatus() {
    if (!this.link) return;
    this.link.onStatus = (status, detail) => {
      if (status === 'connected') {
        this.statusText.setText('Opponent connected! Picking styles...');
        this.time.delayedCall(600, () => this.scene.start(SCENES.STYLE_SELECT, { mode: 'pvp' }));
      } else if (status === 'error') {
        this.statusText.setText(`Connection error:\n${detail ?? 'unknown'}`);
      } else if (status === 'closed') {
        this.statusText.setText('Connection closed.');
      }
    };
  }
}
