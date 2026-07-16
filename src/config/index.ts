import {
  registerPromptHook,
  registerSubstitute,
  registerTrigger,
  setSidebar,
  showme,
} from "../client";

import "./state";
import "./aliases";
import "./connect";
import "./auth";
import "./movement";
import "./bot";
import "./eating";

import "./skills/drunk";
import "./skills/warcry";

import "./highlights";

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
    for (let offset = -10; offset <= 10; offset++) {
      result.push(mapLines[markerIndex + offset] ?? "");
    }
    setSidebar(result, 0, 21);
  }
  mapLines.length = 0;
});

registerSubstitute((text) => text.replaceAll(/^:[^\r\n]*\r?\n/gm, ''));
