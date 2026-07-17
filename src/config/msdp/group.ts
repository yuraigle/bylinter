import { COLOR } from "../../client/ansi";
import { type GroupMember } from "./types";

export function parseGroupMember(raw: Record<string, unknown>): GroupMember {
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

const GROUP_LINES_HEADER = "Имя           тут  хп движ   мем афф.    позиция";

const PLAYER_NAME_RE = /^[А-ЯЁ][а-яё]+$/;

export function formatGroupLines(members: GroupMember[]): string[] {
  const players = members.filter((m) => PLAYER_NAME_RE.test(m.name));
  const others = members.filter((m) => !PLAYER_NAME_RE.test(m.name));

  const groupLines: string[] = [];
  groupLines.push(GROUP_LINES_HEADER);
  groupLines.push(...players.map(formatGroupLine));
  groupLines.push(...others.map(formatGroupLine));

  return groupLines;
}

function formatGroupLine(member: GroupMember): string {
  const name = member.name.slice(0, 14).padEnd(14);

  const hereColor = member.isHere ? COLOR.black : COLOR.red;
  const here = hereColor + `${member.isHere ? "+" : "-"}` + COLOR.reset;

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

  const posColor = ["Стоит", "Сражается"].includes(member.position)
    ? ""
    : COLOR.brightRed;
  const position = posColor + member.position.slice(0, 9).padStart(9);

  return [name, here, health, move, memTime, affects, position].join(" ");
}
