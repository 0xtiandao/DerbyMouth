// src/stats.ts — local stats qua localStorage (Phase 3).
// Phase 4: chuyển lên Cloudflare D1 theo wallet (stats on-record làm căn cứ airdrop).
export interface PlayerStats {
  matches: number;
  wins: number;
  losses: number;
  streak: number; // chuỗi thắng hiện tại
  bestStreak: number;
}

const KEY = 'derbymouth.stats.v1';
const ZERO: PlayerStats = { matches: 0, wins: 0, losses: 0, streak: 0, bestStreak: 0 };

export function loadStats(): PlayerStats {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...ZERO };
    return { ...ZERO, ...(JSON.parse(raw) as Partial<PlayerStats>) };
  } catch {
    return { ...ZERO };
  }
}

/** Ghi nhận kết quả 1 trận, trả về stats mới (gọi 1 lần ở ResultScene). */
export function recordMatch(won: boolean): PlayerStats {
  const stats = loadStats();
  stats.matches++;
  if (won) {
    stats.wins++;
    stats.streak++;
    if (stats.streak > stats.bestStreak) stats.bestStreak = stats.streak;
  } else {
    stats.losses++;
    stats.streak = 0;
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(stats));
  } catch {
    // private mode / hết quota — stats là nice-to-have, không chặn game
  }
  return stats;
}
