import { $ } from "bun";
import { mkdir, cp, rename, rm } from "node:fs/promises";
import { rcedit } from "rcedit";

// ожидаем в /vendor файлы из
// https://github.com/alacritty/alacritty/releases (win-portable)
// https://github.com/pkgforge-dev/alacritty-AppImage (linux)

// чтобы билдить из винды:
// choco install rustup.install
// rustup target add x86_64-unknown-linux-musl
// rustup toolchain install stable-x86_64-pc-windows-gnu

import pkg from "../package.json";
const VERSION = pkg.version;

async function copyDistAssets(dir: string, platform: "win" | "linux") {
  await cp("dist-assets/common", dir, { recursive: true });
  await cp(`dist-assets/${platform}`, dir, { recursive: true });
  await rename(`${dir}/.env.example`, `${dir}/.env`);
}

async function buildLauncherForWin(dir: string) {
  const windres = process.platform === "win32" ? "windres" : "x86_64-w64-mingw32-windres";
  await $`${windres} native/launcher-win.rc -O coff -o native/launcher-win.res.o`;

  await $`rustup run stable-x86_64-pc-windows-gnu rustc --edition 2021 \
    -C opt-level=z -C lto=yes -C codegen-units=1 -C strip=symbols -C debuginfo=0 \
    -C link-arg=native/launcher-win.res.o \
    ./native/launcher-win.rs -o ${dir}/bylinter.exe`;
}

async function buildLauncherForLinux(dir: string) {
  await $`rustc --edition 2021 --target x86_64-unknown-linux-musl -C linker=rust-lld \
    -C opt-level=z -C lto=yes -C codegen-units=1 -C strip=symbols -C debuginfo=0 \
    ./native/launcher-linux.rs -o ${dir}/bylinter`;
}

async function buildWindowsApp() {
  const dir = `release/bylinter-win-${VERSION}`;
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });

  await $`bun build --compile --target=bun-windows-x64 --production src/index.ts --outfile ${dir}/bylinter-cli.exe`;
  await buildLauncherForWin(dir);

  await copyDistAssets(dir, "win");

  await rcedit("vendor/alacritty-win/alacritty.exe", { icon: "native/icon.ico" });
  await cp("vendor/alacritty-win", `${dir}/term`, { recursive: true });
  await cp("README.md", `${dir}/README.md`);
  await cp("LICENSE", `${dir}/LICENSE`);

  await $`cd release/bylinter-win-${VERSION} && 7z a -t7z -mx=9 -m0=BCJ2 -m1=LZMA2:d=128m:fb=273 \
    -m2=LZMA2:d=4m -m3=LZMA2:d=4m -mb0:1 -mb0s1:2 -mb0s2:3 ../bylinter-win-${VERSION}.7z "*"`;
}

async function buildLinuxApp() {
  const dir = `release/bylinter-linux-${VERSION}`;
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });

  await $`bun build --compile --target=bun-linux-x64 --production src/index.ts --outfile ${dir}/bylinter-cli`;
  await buildLauncherForLinux(dir);

  await copyDistAssets(dir, "linux");
  await cp("vendor/alacritty-linux", `${dir}/term`, { recursive: true });
  await cp("README.md", `${dir}/README.md`);
  await cp("LICENSE", `${dir}/LICENSE`);

  if (process.platform === "win32") {
    await $`cd release/bylinter-linux-${VERSION} && 7z a -ttar ../bylinter-linux-${VERSION}.tar "*"`;
    await $`cd release && 7z a -txz -mx=9 bylinter-linux-${VERSION}.tar.xz bylinter-linux-${VERSION}.tar`;
    await $`cd release && rm bylinter-linux-${VERSION}.tar`;
    // если билдим из win, файлу должен будет проставить +x пользователь
  } else {
    await $`chmod +x ${dir}/bylinter-cli`; // если билдим из linux, можем проставить файл как исполняемый
    await $`cd release/bylinter-linux-${VERSION} && tar -cJf ../bylinter-linux-${VERSION}.tar.xz .`;
  }
}

await buildWindowsApp();
await buildLinuxApp();
console.log("✓ done");
