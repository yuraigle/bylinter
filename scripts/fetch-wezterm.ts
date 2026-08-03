import { $, Glob } from "bun";
import { tmpdir } from "node:os";
import { mkdir, readdir, rm, rename } from "node:fs/promises";
import * as path from "node:path";
import { cp } from "node:fs/promises";

const WEZTERM_VERSION = "20240203-110809-5046fc22";
const PROXY = process.env.HTTP_PROXY || process.env.HTTPS_PROXY || "";

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

function curlArgs(url: string, outPath: string): string[] {
  const args = ["-L", url, "-o", outPath];
  if (PROXY) {
    args.unshift("-x", PROXY);
  }
  return args;
}

async function downloadIfMissing(url: string, outPath: string): Promise<void> {
    try {
        await Bun.file(outPath).stat();
        console.log(`Skip download for ${path.basename(outPath)}`);
    } catch {
        console.log(`Downloading ${path.basename(outPath)}...`);
        await $`curl ${curlArgs(url, outPath)}`;
    }
}

async function findExtractedDir(extractPath: string, glob: string): Promise<string> {
  const g = new Glob(glob);
  for await (const entry of g.scan({ cwd: extractPath, onlyFiles: false })) {
    return path.join(extractPath, entry);
  }
  throw new Error(`No directory matching "${glob}" found in ${extractPath}`);
}

for (const t of targets) {
  const systemTmp = tmpdir();
  const dest = `vendor/wezterm-${t.platform}`;
  await rm(dest, { recursive: true, force: true });
  await mkdir(dest, { recursive: true });

  if (t.isAppImage) {
    // download
    const outPath = path.join(systemTmp, 'WezTerm.AppImage');
    await downloadIfMissing(t.url, outPath);

    // extract
    await cp(outPath, path.join(dest, 'WezTerm.AppImage'))
    if (process.platform !== "win32") {
      await $`chmod +x ${outPath}`;
    }
  } else {
    // download
    const outPath = path.join(systemTmp, `wezterm-${t.platform}.zip`);
    await downloadIfMissing(t.url, outPath);

    // extract
    const extractPath = path.join(systemTmp, `wezterm-${t.platform}-extracted`);
    await $`unzip -q ${outPath} -d ${extractPath}`;

    // move
    const globPath = t.extractedDirGlob
      ? await findExtractedDir(extractPath, t.extractedDirGlob)
      : extractPath;
    const sourceFiles = await readdir(globPath);
    for (const file of sourceFiles) {
      await rename(path.join(globPath, file), path.join(dest, file));
    }

    // чтобы уменьшить размер бандла
    if (t.platform === "win") {
      await rm(`${dest}/wezterm.pdb`, { force: true });
      await rm(`${dest}/wezterm.exe`, { force: true });
      await rm(`${dest}/wezterm-mux-server.exe`, { force: true });
      await rm(`${dest}/strip-ansi-escapes.exe`, { force: true });
    }

    // удаляем временные файлы
    // await rm(zipPath, { force: true });
    // await rm(extractPath, { recursive: true, force: true });
  }
  console.log(`OK: ${t.platform} -> ${dest}`);
}
