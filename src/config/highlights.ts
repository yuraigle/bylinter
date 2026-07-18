import { wecho, registerGag, registerTrigger } from "../client";
import { formatRuTime } from "./utils";

// Какой-то дебаг мне Стрибог добавил
registerGag(/^(\x1b\[[0-9;]*m)*Скилл: /);
registerGag(/^(\x1b\[[0-9;]*m)*Дамага /);

function tsfmt() {
  return "[" + formatRuTime(Date.now()) + "] ";
}

registerTrigger(/^[А-ЯЁ][а-яё]+ сказал.? : '.+'/, (m, colored) => {
  wecho(2, tsfmt() + colored);
});

registerTrigger(/^[А-ЯЁ][а-яё]+ сообщил.? группе : '.+'/, (m, colored) => {
  wecho(2, tsfmt() + colored);
});

registerTrigger(/^[А-ЯЁ][а-яё]+ сказал. [А-ЯЁ][а-яё]+ : '.+'/, (m, colored) => {
  wecho(2, tsfmt() + colored);
});

registerTrigger(/^[А-ЯЁ][а-яё]+ (дружине|союзникам): '.+'\./, (m, colored) => {
  wecho(2, tsfmt() + colored);
});
