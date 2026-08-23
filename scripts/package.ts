import { $ } from "bun";
import { mkdir, cp, rename, rm } from "node:fs/promises";

// ожидаем в /vendor файлы из
// https://github.com/alacritty/alacritty/releases (win-portable)
// https://github.com/pkgforge-dev/alacritty-AppImage (linux)

import pkg from "../package.json";
const VERSION = pkg.version;

async function copyDistAssets(dir: string, platform: "win" | "linux") {
  await cp("dist-assets/common", dir, { recursive: true });
  await cp(`dist-assets/${platform}`, dir, { recursive: true });
  await rename(`${dir}/.env.example`, `${dir}/.env`);
}

async function buildLauncherWin(dir: string) {
  await $`x86_64-w64-mingw32-windres native/launcher.rc -O coff -o native/launcher.res.o`;
  await $`x86_64-w64-mingw32-gcc -mwindows -O2 -o ${dir}/bylinter.exe native/launcher.c native/launcher.res.o`;
}

async function buildLauncherLinux(dir: string) {
  await $`gcc -O2 -o ${dir}/bylinter native/launcher-linux.c`;
}

async function buildWindows() {
  const dir = `release/bylinter-win-${VERSION}`;
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
  await $`bun build --compile --target=bun-windows-x64 src/index.ts --outfile ${dir}/bylinter-cli.exe`;
  await buildLauncherWin(dir);
  await copyDistAssets(dir, "win");
  await cp("vendor/alacritty-win", `${dir}/term`, { recursive: true });
  await cp("README.md", `${dir}/README.md`);
  await cp("LICENSE", `${dir}/LICENSE`);
  await $`cd release && 7z a -t7z -m0=lzma2 -mx=9 bylinter-win-${VERSION}.7z bylinter-win-${VERSION}`;
}

async function buildLinux() {
  const dir = `release/bylinter-linux-${VERSION}`;
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
  await $`bun build --compile src/index.ts --outfile ${dir}/bylinter-cli`;
  await $`chmod +x ${dir}/bylinter-cli`;
  await buildLauncherLinux(dir);
  await copyDistAssets(dir, "linux");
  await cp("vendor/alacritty-linux", `${dir}/term`, { recursive: true });
  await $`chmod +x ${dir}/run.sh`;
  await cp("README.md", `${dir}/README.md`);
  await cp("LICENSE", `${dir}/LICENSE`);
  await $`cd release && tar -cJf bylinter-linux-${VERSION}.tar.xz bylinter-linux-${VERSION}`;
}

await buildWindows();
await buildLinux();
console.log("✓ done → release/");
