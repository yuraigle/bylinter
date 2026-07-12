import { registerMsdpHook, registerPromptHook } from "../client/triggers";

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

export interface GameState {
  msdpRoom: Room | null;
}

const state: GameState = {
  msdpRoom: null,
};

export function getState(): Readonly<GameState> {
  return state;
}

registerMsdpHook((data) => {
  if (data.ROOM && typeof data.ROOM === "object" && !Array.isArray(data.ROOM)) {
    state.msdpRoom = parseRoom(data.ROOM as Record<string, unknown>);
  }
});

// registerPromptHook(() => {
//   const str = JSON.stringify(state.msdpRoom);
//   process.stdout.write(`\r\n\x1b[33m> ${str}\x1b[0m\r\n`);
//   return false;
// }, 0);

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
