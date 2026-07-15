import { registerMsdpHook, setSidebar, showme } from "../client";
import { COLOR } from "../client/ansi";

export interface RoomExits {
  [direction: string]: number; // "n" -> vnum
}

export interface Room {
  vnum: number;
  name: string;
  area: string;
  zone: number;
  fromRoom: number;
  fromDirection: string;
  terrain: string;
  exits: RoomExits;
}

export interface GroupMember {
  name: string;
  health: number;
  move: number;
  isHere: boolean;
  memTime: number;
  affects: string;
  role: string;
  position: string;
}

export interface GameState {
  msdpRoom: Room | null;
  msdpGroup: GroupMember[];
}

const state: GameState = {
  msdpRoom: null,
  msdpGroup: [],
};

export function getState(): Readonly<GameState> {
  return state;
}

registerMsdpHook((data) => {
  if (data.ROOM && typeof data.ROOM === "object" && !Array.isArray(data.ROOM)) {
    state.msdpRoom = parseRoom(data.ROOM as Record<string, unknown>);
  }

  if (data.GROUP) {
    showme("msdp updated: GROUP", true);
  }

  if (Array.isArray(data.GROUP)) {
    state.msdpGroup = data.GROUP.map((member) =>
      parseGroupMember(member as Record<string, unknown>),
    );
    const groupLines: string[] = [];
    groupLines.push(GROUP_LINES_HEADER);
    groupLines.push(...state.msdpGroup.map(formatGroupLine));
    setSidebar(groupLines, 22, 44);
  }
});

function parseRoom(raw: Record<string, unknown>): Room {
  const rawExits = (raw.EXITS as Record<string, string>) ?? {};
  const exits: RoomExits = {};
  for (const [dir, vnum] of Object.entries(rawExits)) {
    exits[dir] = Number(vnum);
  }

  return {
    vnum: Number(raw.VNUM ?? 0),
    name: String(raw.NAME ?? ""),
    area: String(raw.AREA ?? ""),
    zone: Number(raw.ZONE ?? 0),
    fromRoom: Number(raw.FROM_ROOM ?? 0),
    fromDirection: String(raw.FROM_DIRECTION ?? ""),
    terrain: String(raw.TERRAIN ?? ""),
    exits,
  };
}

function parseGroupMember(raw: Record<string, unknown>): GroupMember {
  return {
    name: String(raw.NAME ?? ""),
    health: Number(raw.HEALTH ?? 0),
    move: Number(raw.MOVE ?? 0),
    isHere: raw.IS_HERE === "1",
    memTime: Number(raw.MEM_TIME ?? 0),
    affects: String(raw.AFFECTS ?? ""),
    role: String(raw.ROLE ?? ""),
    position: String(raw.POSITION ?? ""),
  };
}

const GROUP_LINES_HEADER = "Имя           тут  хп движ   мем афф.   позиция";

function formatGroupLine(member: GroupMember): string {
  const name = member.name.slice(0, 14).padEnd(14);

  const hereColor = member.isHere ? COLOR.black : COLOR.red;
  const here = hereColor + `${member.isHere ? '+' : '-'}` + COLOR.reset;

  let healthColor: string = COLOR.green;
  if (member.health < 100) healthColor = COLOR.brightGreen;
  if (member.health < 80) healthColor = COLOR.yellow;
  if (member.health < 60) healthColor = COLOR.brightYellow;
  if (member.health < 40) healthColor = COLOR.brightRed;
  if (member.health < 20) healthColor = COLOR.red;
  const health = healthColor + `${member.health}%`.padStart(4) + COLOR.reset;

  const moveColor = member.move < 40 ? COLOR.yellow : COLOR.black;
  const move = moveColor + `${member.move}%`.padStart(4) + COLOR.reset;

  const memTime =
    member.memTime > 0
      ? String(member.memTime).slice(0, 4).padStart(4) + "с"
      : "     ";

  const affects = member.affects.slice(0, 5).padEnd(5);

  const posColor = member.position === "Стоит" ? "" : COLOR.brightRed;
  const position = posColor + member.position.slice(0, 8).padStart(8);

  return [name, here, health, move, memTime, affects, position].join(" ");
}
