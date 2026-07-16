import { type Room, type RoomExits } from "./types";

export function parseRoom(raw: Record<string, unknown>): Room {
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
