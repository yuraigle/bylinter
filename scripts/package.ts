import { $ } from "bun";
import { mkdir, cp, rename, rm } from "node:fs/promises";

import pkg from "../package.json";
const VERSION = pkg.version;

async function copyDistAssets(dir: string, platform: "win" | "linux") {
  await cp("dist-assets/common", dir, { recursive: true });
  await cp(`dist-assets/${platform}`, dir, { recursive: true });
  await rename(`${dir}/.env.example`, `${dir}/.env`);
}

async function buildLauncher(dir: string) {
  await $`x86_64-w64-mingw32-windres native/launcher.rc -O coff -o native/launcher.res.o`;
  await $`x86_64-w64-mingw32-gcc -mwindows -O2 -o ${dir}/bylinter.exe native/launcher.c native/launcher.res.o`;
}

async function buildWindows() {
  const dir = `release/bylinter-win-${VERSION}`;
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
  await $`bun build --compile --target=bun-windows-x64 src/index.ts --outfile ${dir}/bylinter-cli.exe`;
  await buildLauncher(dir);
  await copyDistAssets(dir, "win");
  await cp("vendor/wezterm-win", `${dir}/wezterm`, { recursive: true });
  await $`cd release && zip -r bylinter-win-${VERSION}.zip bylinter-win-${VERSION}`;
}

async function buildLinux() {
  const dir = `release/bylinter-linux-${VERSION}`;
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
  await $`bun build --compile src/index.ts --outfile ${dir}/bylinter-cli`;
  await $`chmod +x ${dir}/bylinter-cli`;
  await copyDistAssets(dir, "linux");
  await cp("vendor/wezterm-linux", `${dir}/wezterm`, { recursive: true });
  await $`chmod +x ${dir}/run.sh`;
  await $`cd release && tar -czf bylinter-linux-${VERSION}.tar.gz bylinter-linux-${VERSION}`;
}

await buildWindows();
await buildLinux();
console.log("✓ done → release/");
