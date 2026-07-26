export interface KeyInfo {
  name?: string;
  ctrl: boolean;
  meta: boolean;
  shift: boolean;
  sequence: string;
}

export type BindHandler = () => void;

interface BindSpec {
  ctrl: boolean;
  meta: boolean;
  shift: boolean;
  name: string;
}

const NAME_ALIASES: Record<string, string> = {
  pgup: "pageup",
  pgdn: "pagedown",
  del: "delete",
  esc: "escape",
  enter: "return",
  ret: "return",
};

function normalizeName(name: string): string {
  const lower = name.toLowerCase();
  return NAME_ALIASES[lower] ?? lower;
}

function parseSpec(spec: string): BindSpec {
  const parts = spec.split("-");
  const keyPart = parts.pop();
  if (!keyPart) throw new Error(`Invalid bindkey spec: "${spec}"`);

  let ctrl = false;
  let meta = false;
  let shift = false;

  for (const modifier of parts) {
    if (modifier === "C") ctrl = true;
    else if (modifier === "M") meta = true;
    else if (modifier === "S") shift = true;
    else
      throw new Error(
        `Unknown modifier "${modifier}" in bindkey spec "${spec}"`,
      );
  }

  if (keyPart.length === 1 && keyPart !== keyPart.toLowerCase()) {
    shift = true;
  }

  return { ctrl, meta, shift, name: normalizeName(keyPart) };
}

interface Binding {
  spec: BindSpec;
  handler: BindHandler;
}

const bindings: Binding[] = [];

export function registerBindkey(spec: string, handler: BindHandler): void {
  bindings.push({ spec: parseSpec(spec), handler });
}

export function dispatchBindkey(key: KeyInfo, str: string): boolean {
  for (const { spec, handler } of bindings) {
    if (spec.ctrl !== key.ctrl) continue;
    if (spec.meta !== key.meta) continue;

    if (spec.name.length === 1) {
      const expected = spec.shift ? spec.name.toUpperCase() : spec.name;
      if (str !== expected) continue;
    } else {
      const actualName = normalizeName(key.name ?? "");
      if (actualName !== spec.name) continue;
      if (spec.shift && !key.shift) continue;
    }

    handler();
    return true;
  }
  return false;
}
