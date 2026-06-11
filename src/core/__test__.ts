// src/core/__test__.ts — test nhanh CombatEngine, không cần framework.
// Chạy: npm test  (= npx -y tsx src/core/__test__.ts)
// Dùng card THẬT từ data/cards.ts để test luôn cả data — đổi số trong cards.ts thì sửa expected ở đây.
import type { CardDef, Team } from '../types';
import { BALANCE } from './constants';
import { cardById } from '../data/cards';
import {
  applyDamage,
  applySilence,
  computeDamage,
  createCombatant,
  isSilenced,
  registerCardPlayed,
  resolveCardPlay,
} from './CombatEngine';

const TEAM: Team = { id: 'BRA', name: 'Brazil', color: 0xfddb00 };
const NOW = 100_000; // mốc thời gian giả

let pass = 0;
const fails: string[] = [];

function check(name: string, actual: unknown, expected: unknown) {
  if (Object.is(actual, expected)) {
    pass++;
  } else {
    fails.push(`${name}: expected ${String(expected)}, got ${String(actual)}`);
  }
}

function card(id: string): CardDef {
  const c = cardById(id);
  if (!c) throw new Error(`card ${id} not found in data/cards.ts`);
  return c;
}

// ---------- 1. Baseline: không buff gì ----------
{
  const atk = createCombatant('rebuttal', TEAM, NOW);
  const def = createCombatant('rebuttal', TEAM, NOW); // cùng style → không style buff
  const bd = computeDamage(card('B5'), atk, def, NOW); // Scoreboard: rational, base 50
  check('baseline final = base', bd.final, 50);
  check('baseline comboLevel = 1', bd.comboLevel, 1);
  check('baseline countered = false', bd.countered, false);
}

// ---------- 2. Style buff (RPS 4 style) ----------
{
  const atk = createCombatant('rebuttal', TEAM, NOW);
  const def = createCombatant('filibuster', TEAM, NOW); // rebuttal khắc filibuster
  const bd = computeDamage(card('B5'), atk, def, NOW);
  check('style buff mult', bd.styleBuff, BALANCE.STYLE_BUFF);
  check('style buff final 50*1.25', bd.final, 63); // Math.round(62.5)

  const noAdv = computeDamage(card('B5'), def, atk, NOW); // filibuster không khắc rebuttal
  check('style buff không áp chiều ngược', noAdv.styleBuff, 1);
}

// ---------- 3. Counter window (content type, 5s) ----------
{
  const atk = createCombatant('rebuttal', TEAM, NOW);
  const def = createCombatant('rebuttal', TEAM, NOW);
  registerCardPlayed(def, card('B1'), 1, NOW); // def vừa đánh Trophy Cabinet (intimidation)

  // rational khắc intimidation, trong window 5s → COUNTERED +50%
  const inWindow = computeDamage(card('B5'), atk, def, NOW + 4000);
  check('counter trong window', inWindow.countered, true);
  check('counter final 50*1.5', inWindow.final, 75);

  // hết window → không counter
  const late = computeDamage(card('B5'), atk, def, NOW + BALANCE.COUNTER_WINDOW_MS + 1);
  check('counter ngoài window', late.countered, false);

  // sai loại: emotional không khắc intimidation
  const wrongType = computeDamage(card('B3'), atk, def, NOW + 1000);
  check('sai loại không counter', wrongType.countered, false);
}

// ---------- 4. Combo chain x2/x3, reset sau finale ----------
{
  const atk = createCombatant('rebuttal', TEAM, NOW);
  const def = createCombatant('rebuttal', TEAM, NOW);

  const hit1 = resolveCardPlay(card('B5'), atk, def, NOW); // rational #1
  check('combo #1 level', hit1.comboLevel, 1);
  check('combo #1 final', hit1.final, 50);

  const hit2 = resolveCardPlay(card('B5'), atk, def, NOW + 1000); // rational #2
  check('combo #2 level', hit2.comboLevel, 2);
  check('combo #2 final 50*1.25', hit2.final, 63);

  const hit3 = resolveCardPlay(card('R5'), atk, def, NOW + 2000); // rational #3: Stat Slam 150
  check('combo #3 level', hit3.comboLevel, 3);
  check('combo #3 final 150*2.0', hit3.final, 300);

  const hit4 = resolveCardPlay(card('B5'), atk, def, NOW + 3000); // rational #4 → chuỗi MỚI
  check('combo reset sau finale', hit4.comboLevel, 1);
}

// ---------- 5. Combo đứt khi đổi loại ----------
{
  const atk = createCombatant('rebuttal', TEAM, NOW);
  const def = createCombatant('rebuttal', TEAM, NOW);
  resolveCardPlay(card('B5'), atk, def, NOW); // rational
  resolveCardPlay(card('B5'), atk, def, NOW + 1000); // rational → combo 2
  const switched = resolveCardPlay(card('B1'), atk, def, NOW + 2000); // intimidation
  check('đổi loại → combo đứt', switched.comboLevel, 1);
}

// ---------- 6. Combo đứt khi bị silence ----------
{
  const atk = createCombatant('rebuttal', TEAM, NOW);
  const def = createCombatant('rebuttal', TEAM, NOW);
  resolveCardPlay(card('B5'), atk, def, NOW);
  resolveCardPlay(card('B5'), atk, def, NOW + 1000); // combo 2
  applySilence(atk, BALANCE.TT_SILENCE_MS, NOW + 1500);
  check('đang silence', isSilenced(atk, NOW + 2000), true);
  check('hết silence', isSilenced(atk, NOW + 1500 + BALANCE.TT_SILENCE_MS), false);
  const after = resolveCardPlay(card('B5'), atk, def, NOW + 4000); // rational tiếp
  check('silence → combo đứt', after.comboLevel, 1);
}

// ---------- 7. Mark bonus ----------
{
  const atk = createCombatant('rebuttal', TEAM, NOW);
  const def = createCombatant('rebuttal', TEAM, NOW);
  def.marks.push({ value: 10, expiresAt: NOW + 6000 }); // như P2 Plastic Fan Alert
  const marked = computeDamage(card('B5'), atk, def, NOW + 1000);
  check('mark bonus 1.1', marked.markBonus, 1.1);
  check('mark final 50*1.1', marked.final, 55);

  const expired = computeDamage(card('B5'), atk, def, NOW + 7000);
  check('mark hết hạn', expired.markBonus, 1);
}

// ---------- 8. Full stack: trần ~4.1x (CARDS.md mục 0) ----------
{
  const atk = createCombatant('rebuttal', TEAM, NOW); // khắc filibuster
  const def = createCombatant('filibuster', TEAM, NOW);
  registerCardPlayed(def, card('B1'), 1, NOW - 1000); // def vừa đánh intimidation
  def.marks.push({ value: 10, expiresAt: NOW + 5000 });
  atk.lastCardContent = 'rational';
  atk.comboCount = 2; // đòn này là finale x3
  const bd = computeDamage(card('R5'), atk, def, NOW); // 150 × 1.25 × 1.5 × 2.0 × 1.1
  check('full stack final', bd.final, 619); // round(618.75) — "Pub Knockout moment"
}

// ---------- 9. counterBonus (R1): +30 vào base khi COUNTERED ----------
{
  const atk = createCombatant('rebuttal', TEAM, NOW);
  const def = createCombatant('rebuttal', TEAM, NOW);
  registerCardPlayed(def, card('B1'), 1, NOW - 1000); // intimidation
  const bd = computeDamage(card('R1'), atk, def, NOW); // Source?!: rational 60 + 30
  check('counterBonus base 60+30', bd.base, 90);
  check('counterBonus final 90*1.5', bd.final, 135);

  const notCountered = computeDamage(card('R1'), atk, def, NOW + 6000);
  check('counterBonus không cộng khi miss counter', notCountered.base, 60);
}

// ---------- 10. comboFinisherX2 (B3): x2 thêm khi là card chốt x3 ----------
{
  const atk = createCombatant('rebuttal', TEAM, NOW);
  const def = createCombatant('rebuttal', TEAM, NOW);
  atk.lastCardContent = 'emotional';
  atk.comboCount = 2;
  const bd = computeDamage(card('B3'), atk, def, NOW); // Ratio'd: 70 × (2.0 × 2)
  check('finisher comboMult 4.0', bd.comboMult, 4);
  check('finisher final 70*4', bd.final, 280);
}

// ---------- 11. Shield: chặn đúng 1 đòn rồi mất ----------
{
  const def = createCombatant('rebuttal', TEAM, NOW);
  def.shields = 50;
  const r1 = applyDamage(def, 80);
  check('shield chặn 50', r1.absorbed, 50);
  check('mf mất 30', r1.mfLoss, 30);
  check('mf còn 970', def.mf, BALANCE.MF_MAX - 30);
  check('shield hết sau đòn', def.shields, 0);

  def.shields = 50;
  applyDamage(def, 30); // chặn chưa hết giá trị vẫn mất shield
  check('shield mất hết dù chặn 30/50', def.shields, 0);

  def.shields = 50;
  applyDamage(def, 0); // đòn 0 dmg (Beer Break) không tốn shield
  check('đòn 0 dmg không tốn shield', def.shields, 50);
}

// ---------- Tổng kết ----------
console.log(`\nCombatEngine: ${pass} passed, ${fails.length} failed`);
if (fails.length > 0) {
  for (const f of fails) console.log(`  FAIL  ${f}`);
  throw new Error(`${fails.length} test(s) failed`);
}
