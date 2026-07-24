import path from "node:path";
import { existsSync } from "node:fs";
import { showme } from "./client";

// 1) файл можно передать как параметр -c path_to_config.ts
// 2) файл config.ts рядом с приложением
// 3) файл config/index.ts рядом с приложением
// 4) если нет, то запускаем пустой клиент

export async function loadUserConfig(): Promise<void> {
  const flagIndex = process.argv.indexOf("-c");
  const userSuppliedPath =
    flagIndex !== -1 ? process.argv[flagIndex + 1] : undefined;

  const candidates = [
    userSuppliedPath,
    path.join(process.cwd(), "config.ts"),
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
