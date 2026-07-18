import { registerPromptHook, sendline } from "../../client";

const reSit1: RegExp = /^Пожалуй, вам лучше встать на ноги\./;
const reSit2: RegExp = /^Нет\.\.\. Вы слишком расслаблены\.\.\./;
const reSit3: RegExp = /^(\x1b\[[0-9;]+m)*Вам лучше встать на ноги!/;

const reSleep: RegExp = /^Сделать это в ваших снах\?/;

registerPromptHook((prompt: string, lines: string[]) => {
  if (lines.some((s) => reSit1.test(s) || reSit2.test(s) || reSit3.test(s))) {
    sendline("вста");
    return true;
  }

  if (lines.some((s) => reSleep.test(s))) {
    sendline("просн;вста");
    return true;
  }

  return false;
}, 50);
