// опционально поменять иконку WezTerm - требует установленного wine
// convert native/icon.png -define icon:auto-resize=256,128,64,48,32,16 native/icon.ico

import { rcedit } from "rcedit";

await rcedit("vendor/wezterm-win/wezterm-gui.exe", {
  icon: "native/icon.ico",
});

console.log("✓ icon patched");
