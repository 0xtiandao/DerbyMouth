// src/pvp/PvpLink.ts — PeerJS wrapper (Phase 4.2): room code + protocol message.
// Chống desync (PLAN mục 8): bên ĐÁNH là nguồn sự thật cho damage của đòn đó
// (gửi kèm final/combo/counter + snapshot MF), nhận theo thứ tự clock,
// heartbeat MF mỗi 2s sửa trôi. Không lockstep cứng — đủ cho pub banter.
import Peer from 'peerjs';
import type { DataConnection } from 'peerjs';
import type { QuizQuestion, Style } from '../types';

export type PvpAction =
  | {
      kind: 'play';
      cardId: string;
      line: string;
      final: number;
      countered: boolean;
      comboLevel: number;
      mfSelf: number; // MF của người đánh SAU đòn (đã tính lifesteal)
    }
  | { kind: 'switch'; style: Style }
  | { kind: 'tt'; ttKind: 'heavy' | 'recover' | 'silence'; line: string; dmg: number; mfSelf: number };

export type PvpMessage =
  | { t: 'hello'; teamId: string }
  | { t: 'style'; style: Style }
  | { t: 'act'; clock: number; action: PvpAction }
  | { t: 'mf'; mf: number } // heartbeat sửa trôi
  | { t: 'quizAsk'; quiz: QuizQuestion; bonus: number }
  | { t: 'quizAns'; correct: boolean; answer: string }
  | { t: 'bye' };

export type PvpStatus = 'idle' | 'opening' | 'waiting' | 'connected' | 'error' | 'closed';

const PEER_PREFIX = 'derbymouth-';
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ'; // bỏ I/L/O dễ nhầm

export class PvpLink {
  private peer: Peer | null = null;
  private conn: DataConnection | null = null;
  private queue: PvpMessage[] = [];
  private handler: ((m: PvpMessage) => void) | null = null;

  isHost = false;
  code = '';
  status: PvpStatus = 'idle';
  remoteTeamId: string | null = null;
  remoteStyle: Style | null = null;
  onStatus: (status: PvpStatus, detail?: string) => void = () => {};

  constructor(readonly myTeamId: string) {}

  static makeCode(): string {
    let code = '';
    for (let i = 0; i < 5; i++) code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    return code;
  }

  /** Tạo phòng — peer id = derbymouth-<code>, chờ đối thủ connect. */
  host(code: string) {
    this.isHost = true;
    this.code = code;
    this.setStatus('opening');
    this.peer = new Peer(`${PEER_PREFIX}${code}`);
    this.peer.on('open', () => this.setStatus('waiting'));
    this.peer.on('connection', (conn) => this.attach(conn));
    this.peer.on('error', (err) => this.setStatus('error', String(err)));
  }

  /** Vào phòng theo code. */
  join(code: string) {
    this.isHost = false;
    this.code = code;
    this.setStatus('opening');
    this.peer = new Peer();
    this.peer.on('open', () => {
      const conn = this.peer!.connect(`${PEER_PREFIX}${code}`, { reliable: true });
      this.attach(conn);
    });
    this.peer.on('error', (err) => this.setStatus('error', String(err)));
  }

  private attach(conn: DataConnection) {
    this.conn = conn;
    conn.on('open', () => {
      conn.send({ t: 'hello', teamId: this.myTeamId } satisfies PvpMessage);
      this.setStatus('connected');
    });
    conn.on('data', (data) => this.route(data as PvpMessage));
    conn.on('close', () => this.setStatus('closed'));
    conn.on('error', (err) => this.setStatus('error', String(err)));
  }

  private route(m: PvpMessage) {
    // cache vài field hay đọc trực tiếp giữa các scene
    if (m.t === 'hello') this.remoteTeamId = m.teamId;
    if (m.t === 'style') this.remoteStyle = m.style;
    if (this.handler) this.handler(m);
    else this.queue.push(m); // scene chưa lắng nghe → giữ lại, không rớt message
  }

  /** Scene gắn handler — message dồn trong lúc chuyển scene được flush ngay. */
  setHandler(handler: ((m: PvpMessage) => void) | null) {
    this.handler = handler;
    if (handler) {
      const pending = this.queue;
      this.queue = [];
      for (const m of pending) handler(m);
    }
  }

  send(m: PvpMessage) {
    this.conn?.send(m);
  }

  get connected(): boolean {
    return this.status === 'connected';
  }

  private setStatus(s: PvpStatus, detail?: string) {
    this.status = s;
    this.onStatus(s, detail);
  }

  destroy() {
    this.handler = null;
    try {
      this.conn?.send({ t: 'bye' } satisfies PvpMessage);
    } catch {
      /* ignore */
    }
    this.conn?.close();
    this.peer?.destroy();
    this.peer = null;
    this.conn = null;
    this.status = 'closed';
  }
}

// ----- singleton giữ link sống qua các scene -----
let active: PvpLink | null = null;

export function setActiveLink(link: PvpLink | null) {
  if (active && active !== link) active.destroy();
  active = link;
}

export function getActiveLink(): PvpLink | null {
  return active;
}
