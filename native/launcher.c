#include <windows.h>
#include <stdio.h>
#include <stdlib.h>

int WINAPI WinMain(HINSTANCE hInst, HINSTANCE hPrevInst, LPSTR lpCmdLine, int nCmdShow) {
    char exePath[MAX_PATH];
    GetModuleFileNameA(NULL, exePath, MAX_PATH);
    char *lastSlash = strrchr(exePath, '\\');
    if (lastSlash) *lastSlash = '\0';

    char cmd[2048];
    snprintf(cmd, sizeof(cmd),
        "\"%s\\wezterm\\wezterm-gui.exe\" --config-file \"%s\\termconfig.lua\" "
        "start --cwd \"%s\" -- \"%s\\bylinter-cli.exe\"",
        exePath, exePath, exePath, exePath);

    STARTUPINFOA si = { sizeof(si) };
    PROCESS_INFORMATION pi;
    CreateProcessA(NULL, cmd, NULL, NULL, FALSE, 0, NULL, NULL, &si, &pi);
    return 0;
}
