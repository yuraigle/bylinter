import {
  registerPromptHook,
  registerTrigger,
  sendline,
  stripColors,
} from "../../client";
import { setCondition } from "../state";

let lastDrink: number = 0;

registerTrigger(/^Заклинание : под мухой\s+\((.*)\)\s*$/, (m) => {
  setCondition({ isDrunk: true, isHangover: false });
});

// todo абстиненция

registerTrigger(/^Винные пары ударили вам в голову\.$/, () => {
  setCondition({ isDrunk: true, isHangover: false });
});

registerTrigger(/^Кураж прошел. Мама, лучше бы я умер вчера.$/, () => {
  setCondition({ isDrunk: false, isHangover: true });
  sendline("опохм самогон");
});

registerTrigger(/^Вы отхлебнули .* легкость во всем теле\.\.\.$/, () => {
  setCondition({ isDrunk: false, isHangover: false });
});

registerPromptHook((prompt: string, lines: string[]) => {
  const promptUc = stripColors(prompt);
  if (promptUc.match(/\[/)) return false; // не в бою

  const now = Date.now();
  if (now - lastDrink < 10_000) return false; // не спамить

  const linesUc = lines.map((s) => stripColors(s));

  const isAff = linesUc.some((s) => /^Аффекты: /.test(s));
  if (!isAff) return false;

  const isDrunk = linesUc.some((s) => /^Заклинание : под мухой/.test(s));
  const isHangover = linesUc.some((s) => /^Заклинание : отходняк/.test(s));

  // если среди аффектов есть отходняк
  if (!isDrunk && isHangover) {
    sendline("опохм самогон");
    lastDrink = now;
    return true;
  }

  // если среди аффектов нет пьянки
  if (!isDrunk && !isHangover) {
    sendline("пить самогон");
    lastDrink = now;
    return true;
  }

  return false;
}, 1);
