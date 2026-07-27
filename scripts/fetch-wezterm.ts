import { $ } from "bun";
import { mkdir, readdir, rm, rename } from "node:fs/promises";
import { tmpdir } from "node:os";
import * as path from "node:path";

const WEZTERM_VERSION = "20240203-110809-5046fc22";

const targets = [
  {
    platform: "win",
    url: `https://github.com/wez/wezterm/releases/download/${WEZTERM_VERSION}/WezTerm-windows-${WEZTERM_VERSION}.zip`,
    extractedDirGlob: "WezTerm-windows-*",
  },
  {
    platform: "linux",
    url: `https://github.com/wez/wezterm/releases/download/${WEZTERM_VERSION}/WezTerm-${WEZTERM_VERSION}-Ubuntu20.04.AppImage`,
    extractedDirGlob: "",
    isAppImage: true,
  },
];

for (const t of targets) {
  const dest = `vendor/wezterm-${t.platform}`;
  await rm(dest, { recursive: true, force: true });
  await mkdir(dest, { recursive: true });

  if (t.isAppImage) {
    await $`curl -L ${t.url} -o ${dest}/WezTerm.AppImage`;
    if (process.platform !== 'win32') {
      await $`chmod +x ${dest}/WezTerm.AppImage`;
    }
  } else {
    // download
    const systemTmp = tmpdir();
    const zipPath = path.join(systemTmp, `wezterm-${t.platform}.zip`);
    await $`curl -L ${t.url} -o ${zipPath}`;

    // extract
    const extractPath = path.join(systemTmp, `wezterm-${t.platform}-extracted`);
    await $`unzip -q ${zipPath} -d ${extractPath}`;

    // move
    const globPath = path.join(extractPath, t.extractedDirGlob);
    const sourceFiles = await readdir(globPath);
    for (const file of sourceFiles) {
      await rename(path.join(globPath, file), path.join(dest, file));
    }

    // чтобы уменьшить размер бандла
    if (t.platform === "win") {
      await rm(`${dest}/wezterm.pdb`);
      await rm(`${dest}/wezterm.exe`);
      await rm(`${dest}/wezterm-mux-server.exe`);
    }

    // удаляем временные файлы
    // await rm(zipPath, { force: true });
    // await rm(extractPath, { recursive: true, force: true });
  }
  console.log(`✓ ${t.platform} → ${dest}`);
}
