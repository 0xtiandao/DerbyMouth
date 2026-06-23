// src/data/teams.ts — 48 đội dự World Cup 2026 (3 chủ nhà USA/Canada/Mexico + qualifiers).
// Nguồn: danh sách đội đã giành vé WC 2026 (tra 2026-06-16). Màu = màu nhận diện chính
// (tránh đen tuyền vì nền game tối). Khi có art đội thì màu chỉ còn dùng cho badge/avatar.
import type { Team } from '../types';

export const TEAMS: Team[] = [
  // ===== Chủ nhà (CONCACAF) =====
  { id: 'CAN', name: 'Canada',        color: 0xd52b1e },
  { id: 'MEX', name: 'Mexico',        color: 0x006847 },
  { id: 'USA', name: 'USA',           color: 0x3c3b6e },

  // ===== CONMEBOL =====
  { id: 'ARG', name: 'Argentina',     color: 0x75aadb },
  { id: 'BRA', name: 'Brazil',        color: 0xfddb00 },
  { id: 'COL', name: 'Colombia',      color: 0xfcd116 },
  { id: 'ECU', name: 'Ecuador',       color: 0xffd100 },
  { id: 'PAR', name: 'Paraguay',      color: 0xd52b1e },
  { id: 'URU', name: 'Uruguay',       color: 0x4f8ccc },

  // ===== UEFA =====
  { id: 'AUT', name: 'Austria',       color: 0xed2939 },
  { id: 'BEL', name: 'Belgium',       color: 0xe30613 },
  { id: 'BIH', name: 'Bosnia & Herz.',color: 0x002395 },
  { id: 'CRO', name: 'Croatia',       color: 0xff0000 },
  { id: 'CZE', name: 'Czechia',       color: 0x11457e },
  { id: 'ENG', name: 'England',       color: 0xcf081f },
  { id: 'FRA', name: 'France',        color: 0x0055a4 },
  { id: 'GER', name: 'Germany',       color: 0x999999 },
  { id: 'NED', name: 'Netherlands',   color: 0xff7f00 },
  { id: 'NOR', name: 'Norway',        color: 0xba0c2f },
  { id: 'POR', name: 'Portugal',      color: 0x006600 },
  { id: 'SCO', name: 'Scotland',      color: 0x0065bf },
  { id: 'ESP', name: 'Spain',         color: 0xc60b1e },
  { id: 'SWE', name: 'Sweden',        color: 0xffcd00 },
  { id: 'SUI', name: 'Switzerland',   color: 0xff0000 },
  { id: 'TUR', name: 'Türkiye',       color: 0xe30a17 },

  // ===== AFC =====
  { id: 'AUS', name: 'Australia',     color: 0xffcd00 },
  { id: 'IRN', name: 'Iran',          color: 0x239f40 },
  { id: 'IRQ', name: 'Iraq',          color: 0x007a3d },
  { id: 'JPN', name: 'Japan',         color: 0x000b8c },
  { id: 'JOR', name: 'Jordan',        color: 0xce1126 },
  { id: 'KOR', name: 'Korea Republic',color: 0xcd2e3a },
  { id: 'QAT', name: 'Qatar',         color: 0x8a1538 },
  { id: 'KSA', name: 'Saudi Arabia',  color: 0x006c35 },
  { id: 'UZB', name: 'Uzbekistan',    color: 0x0099b5 },

  // ===== CAF =====
  { id: 'ALG', name: 'Algeria',       color: 0x006233 },
  { id: 'CPV', name: 'Cabo Verde',    color: 0x003893 },
  { id: 'COD', name: 'DR Congo',      color: 0x007fff },
  { id: 'CIV', name: "Côte d'Ivoire", color: 0xf77f00 },
  { id: 'EGY', name: 'Egypt',         color: 0xce1126 },
  { id: 'GHA', name: 'Ghana',         color: 0x006b3f },
  { id: 'MAR', name: 'Morocco',       color: 0xc1272d },
  { id: 'SEN', name: 'Senegal',       color: 0x00853f },
  { id: 'RSA', name: 'South Africa',  color: 0x007749 },
  { id: 'TUN', name: 'Tunisia',       color: 0xe70013 },

  // ===== CONCACAF (ngoài chủ nhà) =====
  { id: 'CUW', name: 'Curaçao',       color: 0x002b7f },
  { id: 'HAI', name: 'Haiti',         color: 0x00209f },
  { id: 'PAN', name: 'Panama',        color: 0xda121a },

  // ===== OFC =====
  { id: 'NZL', name: 'New Zealand',   color: 0xeeeeee },
];

export const teamById = (id: string) => TEAMS.find(t => t.id === id);
