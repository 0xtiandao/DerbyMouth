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

// ============================================================
// Task 1.4 — InspirationSystem
// ============================================================
import { InspirationSystem } from './InspirationSystem';
import { StyleSystem } from './StyleSystem';
import type { StyleSwitchEvent } from './StyleSystem';

// ---------- 12. Inspiration: spend + chặn khi thiếu ----------
{
  const st = createCombatant('rebuttal', TEAM, NOW);
  const insp = new InspirationSystem(st, NOW);
  check('khởi đầu đầy', insp.value, BALANCE.INSPIRATION_MAX);
  check('spend 4 ok', insp.spend(4), true);
  check('còn 6', insp.value, 6);
  check('spend 7 bị chặn', insp.spend(7), false);
  check('chặn → không trừ gì', insp.value, 6);
  check('canAfford 6', insp.canAfford(6), true);
  check('canAfford 7', insp.canAfford(7), false);
}

// ---------- 13. Inspiration: regen +1/2s, cap max ----------
{
  const st = createCombatant('rebuttal', TEAM, NOW);
  const insp = new InspirationSystem(st, NOW);
  insp.spend(5); // còn 5

  check('chưa tới mốc → 0', insp.tick(NOW + BALANCE.INSPIRATION_REGEN_MS - 1), 0);
  check('đúng mốc → +1', insp.tick(NOW + BALANCE.INSPIRATION_REGEN_MS), 1);
  check('giá trị 6', insp.value, 6);
  check('tick lại cùng mốc → 0 (không double)', insp.tick(NOW + BALANCE.INSPIRATION_REGEN_MS), 0);

  // frame trễ: bù nhiều mốc 1 lần nhưng không vượt max
  const farFuture = NOW + BALANCE.INSPIRATION_REGEN_MS * 20;
  check('bù mốc trễ, cap max', insp.tick(farFuture), BALANCE.INSPIRATION_MAX - 6);
  check('đầy max', insp.value, BALANCE.INSPIRATION_MAX);
  check('đầy → tick 0', insp.tick(farFuture + BALANCE.INSPIRATION_REGEN_MS * 2), 0);
  check('đầy → progress 0', insp.regenProgress(farFuture), 0);
}

// ---------- 14. Inspiration: recover / drain ----------
{
  const st = createCombatant('rebuttal', TEAM, NOW);
  const insp = new InspirationSystem(st, NOW);
  insp.spend(8); // còn 2
  check('recover 3 (F5)', insp.recover(3), 3);
  check('giá trị 5', insp.value, 5);
  check('recover quá max chỉ nhận phần thiếu', insp.recover(99), BALANCE.INSPIRATION_MAX - 5);
  insp.spend(9); // còn 1
  check('drain 1 (R4)', insp.drain(1), 1);
  check('drain khi 0 → 0', insp.drain(1), 0);
  check('không âm', insp.value, 0);
}

// ---------- 15. Inspiration: regenProgress cho vòng UI ----------
{
  const st = createCombatant('rebuttal', TEAM, NOW);
  const insp = new InspirationSystem(st, NOW);
  insp.spend(5);
  insp.tick(NOW); // đồng bộ mốc
  check('progress giữa chừng', insp.regenProgress(NOW + BALANCE.INSPIRATION_REGEN_MS / 2), 0.5);
}

// ============================================================
// Task 1.4 — StyleSystem
// ============================================================

// ---------- 16. Switch cooldown 15s ----------
{
  const player = createCombatant('rebuttal', TEAM, NOW);
  const opponent = createCombatant('bluster', TEAM, NOW);
  const styles = new StyleSystem({ player, opponent });

  check('vừa vào trận chưa được switch', styles.canSwitch('player', NOW), false);
  check('switch sớm bị chặn', styles.switchTo('player', 'bluster', NOW + 1000), false);
  check('style giữ nguyên khi bị chặn', styles.styleOf('player'), 'rebuttal');

  const readyAt = NOW + BALANCE.STYLE_SWITCH_COOLDOWN_MS;
  check('đủ 15s → được switch', styles.canSwitch('player', readyAt), true);
  check('switch ok', styles.switchTo('player', 'bluster', readyAt), true);
  check('style đã đổi', styles.styleOf('player'), 'bluster');
  check('cooldown reset sau switch', styles.canSwitch('player', readyAt + 1000), false);
  check(
    'sẵn sàng lại sau 15s nữa',
    styles.canSwitch('player', readyAt + BALANCE.STYLE_SWITCH_COOLDOWN_MS),
    true,
  );
}

// ---------- 17. Switch trùng style không tốn cooldown ----------
{
  const player = createCombatant('rebuttal', TEAM, NOW);
  const opponent = createCombatant('bluster', TEAM, NOW);
  const styles = new StyleSystem({ player, opponent });
  const readyAt = NOW + BALANCE.STYLE_SWITCH_COOLDOWN_MS;
  check('switch sang chính nó → false', styles.switchTo('player', 'rebuttal', readyAt), false);
  check('không tốn cooldown oan', styles.canSwitch('player', readyAt), true);
}

// ---------- 18. Event khi switch + unsubscribe ----------
{
  const player = createCombatant('rebuttal', TEAM, NOW);
  const opponent = createCombatant('bluster', TEAM, NOW);
  const styles = new StyleSystem({ player, opponent });
  const events: StyleSwitchEvent[] = [];
  const unsub = styles.onSwitch((e) => events.push(e));

  const readyAt = NOW + BALANCE.STYLE_SWITCH_COOLDOWN_MS;
  styles.switchTo('player', 'provocation', readyAt);
  check('event bắn 1 lần', events.length, 1);
  check('event.from', events[0].from, 'rebuttal');
  check('event.to', events[0].to, 'provocation');
  check('event.side', events[0].side, 'player');

  styles.switchTo('player', 'bluster', readyAt + 1000); // cooldown → không bắn
  check('switch fail không bắn event', events.length, 1);

  unsub();
  styles.switchTo('opponent', 'rebuttal', readyAt);
  check('unsubscribe → không nhận nữa', events.length, 1);
}

// ---------- 19. Advantage (bên nào đang khắc) ----------
{
  const player = createCombatant('rebuttal', TEAM, NOW);
  const opponent = createCombatant('filibuster', TEAM, NOW); // rebuttal khắc filibuster
  const styles = new StyleSystem({ player, opponent });
  check('player đang khắc', styles.advantage(), 'player');

  opponent.style = 'provocation'; // provocation khắc rebuttal
  check('opponent đang khắc', styles.advantage(), 'opponent');

  opponent.style = 'rebuttal'; // cùng style
  check('không ai khắc ai', styles.advantage(), null);

  opponent.style = 'bluster'; // rebuttal vs bluster: không chiều nào
  check('cặp không liền kề → null', styles.advantage(), null);
}

// ---------- 20. cooldownProgress cho nút switch UI ----------
{
  const player = createCombatant('rebuttal', TEAM, NOW);
  const opponent = createCombatant('bluster', TEAM, NOW);
  const styles = new StyleSystem({ player, opponent });
  check('vừa vào trận progress 0', styles.cooldownProgress('player', NOW), 0);
  check(
    'giữa cooldown progress 0.5',
    styles.cooldownProgress('player', NOW + BALANCE.STYLE_SWITCH_COOLDOWN_MS / 2),
    0.5,
  );
  check(
    'sẵn sàng progress 1',
    styles.cooldownProgress('player', NOW + BALANCE.STYLE_SWITCH_COOLDOWN_MS * 2),
    1,
  );
}

// ============================================================
// Task 1.7 — NpcBrain v1
// ============================================================
import { NpcBrain } from './NpcBrain';

const rngZero = () => 0; // between → min; chọn phần tử [0]

// ---------- 21. Lịch chơi card 3-5s ----------
{
  const npc = createCombatant('rebuttal', TEAM, NOW);
  const brain = new NpcBrain(npc, NOW, rngZero);

  check('trước hạn không làm gì', brain.tick(NOW + BALANCE.NPC_PLAY_INTERVAL_MIN_MS - 1).length, 0);

  const actions = brain.tick(NOW + BALANCE.NPC_PLAY_INTERVAL_MIN_MS);
  check('đúng hạn → 1 action', actions.length, 1);
  check('action là play', actions[0].kind, 'play');
  if (actions[0].kind === 'play') {
    check('card thuộc pool style NPC', actions[0].card.style, 'rebuttal');
    check('card affordable', actions[0].card.cost <= npc.inspiration, true);
  }
  check('đã reschedule — tick lại rỗng', brain.tick(NOW + BALANCE.NPC_PLAY_INTERVAL_MIN_MS).length, 0);
}

// ---------- 22. Nghèo Inspiration → đợi retry ----------
{
  const npc = createCombatant('rebuttal', TEAM, NOW);
  npc.inspiration = 1; // pool rebuttal rẻ nhất cost 2 → không afford
  const brain = new NpcBrain(npc, NOW, rngZero);

  const playAt = NOW + BALANCE.NPC_PLAY_INTERVAL_MIN_MS;
  check('nghèo → không play', brain.tick(playAt).length, 0);
  check('chưa tới retry → vẫn im', brain.tick(playAt + BALANCE.NPC_POOR_RETRY_MS - 1).length, 0);

  npc.inspiration = 2; // đủ mua lá rẻ nhất
  const retry = brain.tick(playAt + BALANCE.NPC_POOR_RETRY_MS);
  check('đủ tiền sau retry → play', retry.length, 1);
  if (retry[0].kind === 'play') check('chọn được lá cost 2', retry[0].card.cost, 2);
}

// ---------- 23. Silence → không nói, hết câm nói liền ----------
{
  const npc = createCombatant('rebuttal', TEAM, NOW);
  const brain = new NpcBrain(npc, NOW, rngZero);
  const playAt = NOW + BALANCE.NPC_PLAY_INTERVAL_MIN_MS;

  applySilence(npc, 2000, playAt - 100);
  check('đang câm → không play', brain.tick(playAt).length, 0);
  // hết câm + đã quá hạn → nói ngay (nextPlayAt không bị dời trong lúc câm)
  const after = brain.tick(playAt - 100 + 2000);
  check('hết câm nói liền', after.length, 1);
  check('action play sau câm', after[0].kind, 'play');
}

// ---------- 24. Switch style ngẫu nhiên 20-30s ----------
{
  const npc = createCombatant('rebuttal', TEAM, NOW);
  const brain = new NpcBrain(npc, NOW, rngZero);
  const switchAt = NOW + BALANCE.NPC_STYLE_SWITCH_MIN_MS;

  // tick đúng hạn switch: quá hạn play từ lâu → cả switch + play trong 1 tick
  const actions = brain.tick(switchAt);
  check('switch + play cùng tick', actions.length, 2);
  check('switch trước', actions[0].kind, 'switch');
  if (actions[0].kind === 'switch') {
    check('style mới khác style cũ', actions[0].style !== npc.style, true);
  }
  check('switch đã reschedule', brain.tick(switchAt + 1).length, 0);
}

// ---------- 25. Silence vẫn cho switch (câm ≠ không đổi thế) ----------
{
  const npc = createCombatant('rebuttal', TEAM, NOW);
  const brain = new NpcBrain(npc, NOW, rngZero);
  const switchAt = NOW + BALANCE.NPC_STYLE_SWITCH_MIN_MS;
  applySilence(npc, 5000, switchAt - 100);
  const actions = brain.tick(switchAt);
  check('câm: chỉ switch, không play', actions.length, 1);
  check('action là switch', actions[0].kind, 'switch');
}

// ---------- Tổng kết ----------
console.log(`\ncore tests: ${pass} passed, ${fails.length} failed`);
if (fails.length > 0) {
  for (const f of fails) console.log(`  FAIL  ${f}`);
  throw new Error(`${fails.length} test(s) failed`);
}
