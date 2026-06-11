// src/data/fallbackRoasts.ts — roast hardcode: dùng cho Phase 1 + fallback khi API lỗi.
// {OPP} = tên đội đối thủ, {MY} = đội mình. Thay bằng team.name lúc runtime.
import type { ContentType, TrashTalkOption } from '../types';

export const FALLBACK_ROASTS: Record<ContentType, string[]> = {
  rational: [
    "{OPP} xG last 5 games says you should be in League Two, not a World Cup.",
    "bro your 'tactics' is hoofing it long and praying, spreadsheet says so.",
    "nah fr {OPP} spent 200M to finish below a team with a food bank sponsor.",
    "your possession stats look like my wifi signal in a basement.",
    "0 shots on target in a final. that's not defending, that's hiding.",
    "{OPP} pass accuracy only high because y'all pass backwards all game.",
  ],
  emotional: [
    "your captain cried on a podcast and somehow that was the season highlight.",
    "nah the whole locker room beefing on Insta while losing 3-0, cinema.",
    "{OPP} fans booing their own keeper... family stuff, love to see it.",
    "bro really defending a club that leaked its own transfer plans, twice.",
    "your star posts gym selfies more than he posts assists.",
    "the manager's press conference had more drama than the actual match.",
  ],
  intimidation: [
    "count the stars on the badge, then count yours. oh wait. zero.",
    "we buy your best player every window like it's grocery shopping.",
    "trophy cabinet so empty y'all store mops in it.",
    "{MY} ticket revenue alone outearns your whole squad, broke ass club.",
    "we've won more finals than {OPP} has even reached. sit down.",
    "your record signing costs less than our bench's left boot.",
  ],
  fanshaming: [
    "name 3 {OPP} players before 2020. I'll wait... thought so, plastic.",
    "you found this team during a title run, glory hunting mf.",
    "bro watches highlights at 2x speed and calls himself a fan nah fr.",
    "what's your number 7's name? no googling. exactly.",
    "you've never seen them play live but got 4 jerseys, paperhands fan.",
    "supported them for 2 seasons and lecturing ME about history? cute.",
  ],
};

// Bộ 3 option cho Trash Talk menu (Phase 1 / fallback). Mỗi bộ: heavy / recover / silence.
export const FALLBACK_TRASHTALK: TrashTalkOption[][] = [
  [
    { text: "say that again but in trophies, I'll wait.", kind: 'heavy' },
    { text: "wow strong words from a mid-table merchant.", kind: 'recover' },
    { text: "shh. adults are talking about real football.", kind: 'silence' },
  ],
  [
    { text: "your whole argument just got VAR'd. overturned.", kind: 'heavy' },
    { text: "is that banter or a cry for help, fam?", kind: 'recover' },
    { text: "mute button found. courtesy of {MY}.", kind: 'silence' },
  ],
  [
    { text: "that take was worse than your back line.", kind: 'heavy' },
    { text: "thanks for the warmup, now watch this.", kind: 'recover' },
    { text: "VAR check: opinion disallowed. play on.", kind: 'silence' },
  ],
];

// Quiz tĩnh mẫu (Phase 2.2 PVE — thay bằng AI pool sau, NHỚ verify đáp án khi thêm)
export const SAMPLE_QUIZ = [
  {
    teamId: 'BRA', difficulty: 'easy' as const,
    q: "How many World Cups has Brazil won?",
    correct: "5", wrong: ["3", "4", "6"],
  },
  {
    teamId: 'GER', difficulty: 'easy' as const,
    q: "What was the score in Germany vs Brazil, 2014 semi-final?",
    correct: "7-1", wrong: ["5-0", "6-1", "7-2"],
  },
  {
    teamId: 'ARG', difficulty: 'easy' as const,
    q: "Who captained Argentina to the 2022 World Cup title?",
    correct: "Lionel Messi", wrong: ["Ángel Di María", "Paulo Dybala", "Emiliano Martínez"],
  },
];
