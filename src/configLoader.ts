import path from "node:path";
import { existsSync } from "node:fs";
import { showme } from "./client";

export async function loadUserConfig(): Promise<void> {
  const lastArg = process.argv[process.argv.length - 1];
  const isScriptPathItself =
    lastArg === process.argv[1] && process.argv.length <= 2;
  const userSuppliedPath =
    !isScriptPathItself && lastArg?.endsWith(".ts") ? lastArg : undefined;

  const candidates = [
    userSuppliedPath,
    path.join(process.cwd(), "config.ts"),
  ].filter((p): p is string => Boolean(p));

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      const absolutePath = path.resolve(candidate);
      await import(absolutePath);
      showme("Loaded file " + candidate, false);
      return;
    }
  }

  showme("No config.ts found", false);
}
