import { sendl } from "../mud";
import { registerPromptHook, registerTrigger } from "../triggers";

let charIsHungry: boolean = false;
let lastEat: number = 0;
const EAT_COOLDOWN_MS = 5000;

registerTrigger(/^Вы голодны\./, () => (charIsHungry = true));
registerTrigger(/^Вы очень голодны\./, () => (charIsHungry = true));
registerTrigger(/^Вы готовы сожрать быка\./, () => (charIsHungry = true));

registerTrigger(/^Вас мучает жажда\./, () => (charIsHungry = true));
registerTrigger(/^Вас сильно мучает жажда\./, () => (charIsHungry = true));
registerTrigger(/^Вам хочется выпить озеро\./, () => (charIsHungry = true));

registerTrigger(
  /^Вы почувствовали себя наевшимся до отвала\./,
  () => (charIsHungry = false),
);

registerPromptHook(() => {
  if (charIsHungry && Date.now() - lastEat > EAT_COOLDOWN_MS) {
    sendl("пить боч.синим");
    lastEat = Date.now();
    return true;
  }

  return false;
}, 1);
