import { registerTrigger, setSidebar, showme } from "../client";

import "./state";
import "./aliases";
import "./connect";
import "./highlights";
import "./auth";
import "./movement";
import "./bot";
import "./assist";

import "./tasks/eating";
import "./tasks/stand";

import "./skills/drunk";
import "./skills/warcry";
import "./skills/rage";
import "./skills/kick";
import "./skills/glush";
import "./skills/mounted";

import { registerGag } from "../client/triggers";

showme("Введите кон для подключения к Былинам", false);

// карта комнат в сайдбаре
const mapLines: string[] = [];
registerTrigger(/^:/, (m, colored: string) => {
  mapLines.push(colored.substring(1));
});

registerTrigger(/^\s*$/, () => {
  // перед и после карты идёт пустая строка
  if (mapLines.length > 0) {
    const markerIndex = mapLines.findIndex((line) => line.includes("@"));
    if (markerIndex === -1) return false;

    // "@" всегда по центру
    const result: string[] = [];
    for (let offset = -9; offset <= 9; offset++) {
      result.push(mapLines[markerIndex + offset] ?? "");
    }

    setSidebar(result, 0, 19);
  }
  mapLines.length = 0;
});

registerGag(/^:.*?/);
