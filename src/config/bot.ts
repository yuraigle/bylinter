import { registerTrigger, sendline } from "../client";
import { getState } from "./state";

const LEADER_NAMES: string[] = (process.env.LEADER_NAMES || "").split(",");

registerTrigger(/^([А-ЯЁ][а-яё]+) сообщила? группе : '!(.*)'$/, (m) => {
  const who = m[1];
  const what = m[2];

  if (LEADER_NAMES.includes(who)) sendline(what);
});

registerTrigger(
  /^([А-ЯЁ][а-яё]+) сообщила? группе : '([А-ЯЁ][а-яё]+) (.*)'$/,
  (m) => {
    const who = m[1];
    const name = m[2];
    const what = m[3];

    if (!LEADER_NAMES.includes(who)) return; // не лидер
    if (getState().me.name !== name) return; // не мне

    sendline(what);
  },
);

registerTrigger(/^Вы мертвы! Нам очень жаль/, () => sendline("1"));

registerTrigger(/^([А-ЯЁ][а-яё]+) сказала? вам : 'след'$/, (m) => {
  const who = m[1];
  if (LEADER_NAMES.includes(who)) sendline(`след .${who}`);
});

let lastAskForRegime = 0;
registerTrigger(/^([А-ЯЁ][а-яё]+) сказала? вам : 'режим'$/, (m) => {
  const who = m[1];
  if (LEADER_NAMES.includes(who)) {
    sendline("реж приз");
    lastAskForRegime = Date.now();
  }
});

registerTrigger(/^Вы защищены от призыва\.$/, () => {
  if (Date.now() - lastAskForRegime < 5000) sendline("от Я защищён от призыва");
});

registerTrigger(/^Вы можете быть призваны\.$/, () => {
  if (Date.now() - lastAskForRegime < 5000) sendline("от Я могу быть призван");
});
