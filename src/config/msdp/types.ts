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

export interface RoomExits {
  [direction: string]: number; // "n" -> vnum
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
