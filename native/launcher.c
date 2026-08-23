#include <stdio.h>
#include <stdlib.h>
#include <windows.h>

int WINAPI WinMain(HINSTANCE hInst, HINSTANCE hPrevInst, LPSTR lpCmdLine,
                   int nCmdShow) {
  char exePath[MAX_PATH];
  GetModuleFileNameA(NULL, exePath, MAX_PATH);
  char *lastSlash = strrchr(exePath, '\\');
  if (lastSlash)
    *lastSlash = '\0';

  char cmd[4096];
  snprintf(cmd, sizeof(cmd),
           "\"%s\\term\\alacritty.exe\" "
           "--config-file \"%s\\term\\alacritty.toml\" "
           "--working-directory \"%s\" -e \"%s\\bylinter-cli.exe\" %s",
           exePath, exePath, exePath, exePath, lpCmdLine);

  STARTUPINFOA si = {sizeof(si)};
  PROCESS_INFORMATION pi;
  CreateProcessA(NULL, cmd, NULL, NULL, FALSE, 0, NULL, NULL, &si, &pi);
  return 0;
}
