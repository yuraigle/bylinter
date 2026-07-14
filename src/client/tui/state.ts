export const state = {
  logLines: [] as string[],
  scrollOffset: 0,
  statusText: "Not connected",
  inputBuffer: "",
  cursorPos: 0,
  history: [] as string[],
  historyPos: 0,
  draft: "",
};

export const MAX_BUFFER_LINES = 2000;
export const MAX_HISTORY = 100;
