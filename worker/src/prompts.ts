// worker/src/prompts.ts — prompt templates theo docs/PLAN.md mục 3.
// 4 content type + boundaries (chỉ roast trong phạm vi bóng đá) + JSON output.

const PERSONA = `You are a savage international pub roast master for World Cup 2026 banter.
Style: punchy, max 20 words per line, Discord-roast vibe ("bro really...", "nah fr", "mf", "broke ass").`;

const BOUNDARIES = `BOUNDARIES: all personal attacks must stay football-related (fan credibility,
team knowledge). NEVER attack appearance, family, race, religion, or anything outside football.
Roast teams and fan culture, not private lives of real people.`;

/** Batch roast: 1 call sinh đủ 4 content type × count câu (ít call → rẻ). */
export function buildRoastPrompt(myTeam: string, oppTeam: string, count: number, avoid: string[]): string {
  const avoidBlock = avoid.length > 0 ? `Avoid these recent lines: ${JSON.stringify(avoid.slice(-8))}\n` : '';
  return `${PERSONA}
My team: ${myTeam}. Opponent's team: ${oppTeam} — use ${oppTeam}'s real history, legends, embarrassing seasons.
Content types:
- rational = stats/tactics/transfer fees
- emotional = drama/memes/scandals
- intimidation = trophies/money/flex
- fanshaming = attack the OPPONENT AS A FAN: question their knowledge ("do you even know who wears #7?"), call them plastic fan / glory hunter / highlight-only watcher, mock when they started supporting
${avoidBlock}${BOUNDARIES}
Output ONLY a JSON object: {"rational": [${count} strings], "emotional": [${count} strings], "intimidation": [${count} strings], "fanshaming": [${count} strings]}. No preamble.`;
}

/** Bộ 3 option cho Trash Talk menu: heavy / recover / silence. */
export function buildTrashTalkPrompt(myTeam: string, oppTeam: string, sets: number): string {
  return `${PERSONA}
My team: ${myTeam}. Opponent's team: ${oppTeam}.
Generate ${sets} sets of comeback lines for a pub argument "rebuttal menu". Max 15 words each. Each set:
- "heavy": a devastating knockout comeback
- "recover": a smug, composed brush-off that makes me look unbothered
- "silence": a line that shuts them up completely
${BOUNDARIES}
Output ONLY a JSON array of ${sets} objects: [{"heavy": "...", "recover": "...", "silence": "..."}]. No preamble.`;
}

/** Quiz pool về 1 đội — facts nổi tiếng, verify được (PLAN mục 3). */
export function buildQuizPrompt(teamName: string, difficulty: string, count: number): string {
  return `Generate ${count} football trivia questions about ${teamName} (national team) for a World Cup 2026 pub quiz.
Difficulty: ${difficulty}. Every question MUST be a well-known, easily verifiable fact
(famous goals, legendary players, shirt numbers, historic results, World Cup history).
Wrong answers must be plausible but clearly incorrect.
Output ONLY a JSON array: [{"q": "...", "correct": "...", "wrong": ["...", "...", "..."]}]. No preamble.`;
}
