import { $ } from "bun";
import { mkdir, rm } from "node:fs/promises";

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
    isAppImage: true,
  },
];

for (const t of targets) {
  const dest = `vendor/wezterm-${t.platform}`;
  await rm(dest, { recursive: true, force: true });
  await mkdir(dest, { recursive: true });

  if (t.isAppImage) {
    await $`curl -L ${t.url} -o ${dest}/WezTerm.AppImage`;
    await $`chmod +x ${dest}/WezTerm.AppImage`;
  } else {
    await $`curl -L ${t.url} -o /tmp/wezterm-${t.platform}.zip`;
    await $`unzip -q /tmp/wezterm-${t.platform}.zip -d /tmp/wezterm-${t.platform}-extracted`;
    await $`bash -c "mv /tmp/wezterm-${t.platform}-extracted/${t.extractedDirGlob}/* ${dest}/"`;
  }
  console.log(`✓ ${t.platform} → ${dest}`);
}
