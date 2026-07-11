import { sendl } from "../mud";
import { registerPromptHook, registerTrigger } from "../triggers";

let charIsHungry: boolean = false;
let lastEatAttempt: number = 0;
const EAT_COOLDOWN_MS = 5000;

registerTrigger(/^Вы готовы сожрать быка\./, () => (charIsHungry = true));
registerTrigger(/^Вам хочется выпить озеро\./, () => (charIsHungry = true));
registerTrigger(
  /^Вы почувствовали себя наевшимся до отвала\./,
  () => (charIsHungry = false),
);

registerPromptHook((prompt, lines) => {
  if (charIsHungry) {
    const now = Date.now();
    if (now - lastEatAttempt < EAT_COOLDOWN_MS) return;
    sendl("пить боч.синим");
    lastEatAttempt = now;
  }
});
