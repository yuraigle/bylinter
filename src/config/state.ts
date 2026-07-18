import {
  registerMsdpHook,
  registerPromptHook,
  registerTrigger,
  sendMsdp,
  setSidebar,
  showme,
  stripColors,
} from "../client";

import { sendline } from "./utils";
import { type GroupMember, type Room } from "./msdp/types";
import { parseRoom } from "./msdp/room";
import { formatGroupLines, parseGroupMember } from "./msdp/group";

export interface GameState {
  me: Character;
  condition: Condition | null;
  msdpRoom: Room | null;
  msdpGroup: GroupMember[];
  lastTick: number;
}

export interface Character {
  name: string;
  prof: string;
}

export interface Condition {
  isDrunk: boolean;
  isHangover: boolean;
}

const state: GameState = {
  me: { name: "", prof: "" },
  condition: null,
  msdpRoom: null,
  msdpGroup: [],
  lastTick: 0,
};

const DEFAULT_CONDITION: Condition = {
  isDrunk: false,
  isHangover: false,
};

export function setCondition(patch: Partial<Condition>): void {
  state.condition = { ...(state.condition ?? DEFAULT_CONDITION), ...patch };
}

export function getState(): Readonly<GameState> {
  return state;
}

// для неумеющих парсить текст есть msdp
registerTrigger(/^Using keytable$/, () => {
  // ["ROOM","EXPERIENCE","GOLD","LEVEL","MAX_HIT","MAX_MOVE","STATE","GROUP"]
  sendMsdp("REPORT", "GROUP"); // а вот это полезно
});

registerMsdpHook((data) => {
  if (data.ROOM && typeof data.ROOM === "object" && !Array.isArray(data.ROOM)) {
    state.msdpRoom = parseRoom(data.ROOM as Record<string, unknown>);
  } else if (data.GROUP && Array.isArray(data.GROUP)) {
    state.msdpGroup = data.GROUP.map((m) => parseGroupMember(m));
    setSidebar(formatGroupLines(state.msdpGroup), 23, 45);
  } else {
    showme(`[msdp] ${JSON.stringify(data)}`, true);
  }
});

registerPromptHook(() => {
  // 3 строки под описание state
  const lines: string[] = [];
  lines[0] = state.me.name + " " + state.me.prof;

  let drunkLine = "";
  if (state.condition?.isDrunk) drunkLine += "Пьян ";
  if (state.condition?.isHangover) drunkLine += "Отходняк ";
  lines[1] = drunkLine;

  setSidebar(lines, 20, 22);
  return false;
}, 0);

registerTrigger(/^Минул час\.$/, () => (state.lastTick = Date.now()));

registerTrigger(/^  Вы ([А-ЯЁ][а-яё]+), ([а-я]+)\. Ваши показатели:/, (m) => {
  state.me.name = m[1];
  state.me.prof = m[2];
});

// раз в 2 мин жмем аффекты
let lastAff = 0;
registerPromptHook((prompt: string) => {
  const promptUc = stripColors(prompt);
  if (promptUc.match(/\[/)) return false; // не в бою

  const now = Date.now();
  if (now - lastAff > 120_000) {
    sendline("афф");
    lastAff = now;
  }
  return false;
}, 0);
