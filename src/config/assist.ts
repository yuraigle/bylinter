import { registerPromptHook, sendline, showme, stripColors } from "../client";
import { getState } from "./state";

const painLevels = [
  "легонько",
  "слегка",
  "сильно",
  "очень сильно",
  "чрезвычайно сильно",
  "БОЛЬНО",
  "ОЧЕНЬ БОЛЬНО",
  "НЕВЫНОСИМО БОЛЬНО",
  "ЧРЕЗВЫЧАЙНО БОЛЬНО",
  "УЖАСНО",
  "ЖЕСТОКО",
  "УБИЙСТВЕННО",
  "СМЕРТЕЛЬНО",
  "ИЗУВЕРСКИ",
];

const re1: RegExp = new RegExp(
  `^([А-ЯЁ][а-яё]+) (${painLevels.join("|")}) [а-я]+ла? (.*)\\.`,
);

const re2: RegExp = /^(.+) сражается с (.+?)(,.*)?!/;

registerPromptHook((prompt: string, lines: string[]) => {
  const promptUc = stripColors(prompt);
  if (promptUc.match(/\[/)) return false; // если уже в бою, ничего не надо

  const mates: string[] = getState().msdpGroup.map((p) => p.name);
  if (mates.length <= 1) return false; // нет группы

  const targets: string[] = [];
  lines.forEach((line) => {
    const m1 = line.match(re1);
    if (m1 && mates.includes(m1[1])) targets.push(m1[3]);

    const m2 = line.match(re2);
    if (m2 && mates.some((mate) => m2[1].includes(mate))) targets.push(m2[2]);
  });

  const aliases = [...new Set(targets.map(makeAlias).filter(Boolean))];

  // showme(`[aliases] ${JSON.stringify(aliases)}`, false);

  const alias = aliases.find(Boolean); // непустой алиас
  if (alias) {
    sendline(`оглуш ${alias}`);
  }

  return false;
}, 10);

function makeAlias(s: string): string {
  const lower = s.toLowerCase().trim();

  // Если цель состоит из 4 букв - обрезать до 3
  if (/^[а-яё]{4}$/.test(lower)) {
    return lower.substring(0, 3);
  }

  const words = lower.split(/[\s\-,]+/);
  let alias = "";
  let wordCount = 0;

  for (const word of words) {
    if (wordCount >= 2) break;
    if (word.length > 3) {
      if (alias) alias += ".";
      alias += word.substring(0, 3);
      wordCount++;
    }
  }

  return alias;
}
