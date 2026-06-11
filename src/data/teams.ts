// src/data/teams.ts — đội World Cup 2026 (bộ khởi điểm, thêm dần đủ 48 đội sau)
import type { Team } from '../types';

export const TEAMS: Team[] = [
  { id: 'BRA', name: 'Brazil',      color: 0xfddb00 },
  { id: 'ARG', name: 'Argentina',   color: 0x75aadb },
  { id: 'GER', name: 'Germany',     color: 0x000000 },
  { id: 'FRA', name: 'France',      color: 0x0055a4 },
  { id: 'ENG', name: 'England',     color: 0xcf081f },
  { id: 'ESP', name: 'Spain',       color: 0xc60b1e },
  { id: 'POR', name: 'Portugal',    color: 0x006600 },
  { id: 'NED', name: 'Netherlands', color: 0xff7f00 },
  { id: 'ITA', name: 'Italy',       color: 0x008c45 },
  { id: 'VIE', name: 'Vietnam',     color: 0xda251d },
  { id: 'JPN', name: 'Japan',       color: 0x000b8c },
  { id: 'USA', name: 'USA',         color: 0x3c3b6e },
  { id: 'MEX', name: 'Mexico',      color: 0x006847 },
  { id: 'KSA', name: 'Saudi Arabia',color: 0x006c35 },
];

export const teamById = (id: string) => TEAMS.find(t => t.id === id);
