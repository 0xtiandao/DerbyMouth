// src/wallet.ts — wallet auth EVM (MetaMask, SIWE-lite) — Phase 4.
// Chỉ sign message, KHÔNG transaction. Session token lưu localStorage.
// Guest mode vẫn chơi bình thường — wallet là tùy chọn để lưu stats on-record.
import { API_BASE } from './api';

export interface WalletSession {
  address: string;
  token: string;
}

const SESSION_KEY = 'derbymouth.session.v1';

interface EthereumProvider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
}

function getEthereum(): EthereumProvider | null {
  return (window as unknown as { ethereum?: EthereumProvider }).ethereum ?? null;
}

export function hasWallet(): boolean {
  return getEthereum() !== null;
}

export function loadSession(): WalletSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as WalletSession) : null;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

/** Connect MetaMask → nonce → personal_sign → verify → session token. */
export async function connectWallet(): Promise<WalletSession> {
  const eth = getEthereum();
  if (!eth) throw new Error('no_wallet');

  const accounts = (await eth.request({ method: 'eth_requestAccounts' })) as string[];
  const address = accounts[0]?.toLowerCase();
  if (!address) throw new Error('no_account');

  const nonceRes = await fetch(`${API_BASE}/api/auth/nonce`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ address }),
  });
  if (!nonceRes.ok) throw new Error('nonce_failed');
  const { message } = (await nonceRes.json()) as { message: string };

  // personal_sign: params [message, address]
  const signature = (await eth.request({
    method: 'personal_sign',
    params: [message, address],
  })) as string;

  const verifyRes = await fetch(`${API_BASE}/api/auth/verify`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ address, signature }),
  });
  if (!verifyRes.ok) throw new Error('verify_failed');
  const session = (await verifyRes.json()) as WalletSession;

  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    /* private mode — session chỉ sống trong RAM */
  }
  return session;
}
