// src/profile.ts — profile local (đội đã chọn) + sync D1 khi có wallet session (Phase 4).
// Guest: chỉ localStorage. Có ví: localStorage là cache, D1 là nguồn thật.
import { API_BASE } from './api';
import type { WalletSession } from './wallet';

export interface LocalProfile {
  teamId: string | null;
}

const PROFILE_KEY = 'derbymouth.profile.v1';

export function loadProfile(): LocalProfile {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? { teamId: null, ...(JSON.parse(raw) as Partial<LocalProfile>) } : { teamId: null };
  } catch {
    return { teamId: null };
  }
}

export function saveProfile(profile: LocalProfile): void {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    /* ignore */
  }
}

export interface RemoteProfile {
  address: string;
  team_id: string | null;
  wins: number;
  losses: number;
  streak: number;
  best_streak: number;
  quiz_stumped: number;
}

export async function fetchRemoteProfile(session: WalletSession): Promise<RemoteProfile | null> {
  const res = await fetch(`${API_BASE}/api/profile`, {
    headers: { authorization: `Bearer ${session.token}` },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { profile: RemoteProfile | null };
  return data.profile;
}

export async function saveRemoteTeam(session: WalletSession, teamId: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/api/profile`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${session.token}` },
    body: JSON.stringify({ teamId }),
  });
  return res.ok;
}

/** Gửi kết quả trận lên D1 (fire-and-forget từ ResultScene — lỗi mạng bỏ qua). */
export async function postMatchResult(
  session: WalletSession,
  won: boolean,
  quizStumped: number,
): Promise<void> {
  await fetch(`${API_BASE}/api/profile/result`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${session.token}` },
    body: JSON.stringify({ won, quizStumped }),
  }).catch(() => undefined);
}
