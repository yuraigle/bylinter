import path from "node:path";
import { existsSync } from "node:fs";
import { showme } from ".";

// 1) файл .ts из argv
// 2) файл config.ts рядом с приложением
// 3) если нет, то запускаем пустой клиент

export async function loadUserConfig(): Promise<void> {
  const lastArg = process.argv[process.argv.length - 1];
  const isScriptPathItself =
    lastArg === process.argv[1] && process.argv.length <= 2;
  const userSuppliedPath =
    !isScriptPathItself && lastArg?.endsWith(".ts") ? lastArg : undefined;

  const candidates = [
    userSuppliedPath,
    path.join(process.cwd(), "config", "index.ts"),
  ].filter((p): p is string => Boolean(p));

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      const absolutePath = path.resolve(candidate);
      showme("Using file " + absolutePath);
      await import(absolutePath);
      return;
    }
  }

  showme("No config.ts found");
}
