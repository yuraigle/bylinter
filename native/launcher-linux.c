#include <limits.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

int main(int argc, char *argv[]) {
  char exePath[PATH_MAX];
  ssize_t len = readlink("/proc/self/exe", exePath, sizeof(exePath) - 1);
  if (len == -1) {
    perror("readlink failed");
    return 1;
  }
  exePath[len] = '\0';

  char *lastSlash = strrchr(exePath, '/');
  if (lastSlash) {
    *lastSlash = '\0';
  }

  char alacrittyPath[PATH_MAX];
  char configPath[PATH_MAX];
  char cliPath[PATH_MAX];
  snprintf(alacrittyPath, sizeof(alacrittyPath), "%s/term/alacritty.AppImage", exePath);
  snprintf(configPath, sizeof(configPath), "%s/term/alacritty.toml", exePath);
  snprintf(cliPath, sizeof(cliPath), "%s/bylinter-cli", exePath);

  char **newArgv = malloc(sizeof(char *) * (8 + (argc - 1) + 1));
  int i = 0;

  newArgv[i++] = alacrittyPath;
  newArgv[i++] = "--config-file";
  newArgv[i++] = configPath;
  newArgv[i++] = "--working-directory";
  newArgv[i++] = exePath;
  newArgv[i++] = "-e";
  newArgv[i++] = cliPath;

  for (int j = 1; j < argc; j++) {
    newArgv[i++] = argv[j];
  }
  newArgv[i] = NULL;

  execv(alacrittyPath, newArgv);

  perror("execv failed");
  free(newArgv);
  return 1;
}
