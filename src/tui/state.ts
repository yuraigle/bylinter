export interface WindowState {
  logLines: string[];
  wrappedRows: string[];
  rowCounts: number[];
  wrapWidth: number;
  scrollOffset: number;
  carrySgr: string;
}

function createWindow(): WindowState {
  return {
    logLines: [],
    wrappedRows: [],
    rowCounts: [],
    wrapWidth: 0,
    scrollOffset: 0,
    carrySgr: "",
  };
}

export const state = {
  currentWindow: 1,
  windows: new Map<number, WindowState>([[1, createWindow()]]),

  statusText: "Not connected",
  inputBuffer: "",
  cursorPos: 0,
  history: [] as string[],
  historyPos: 0,
  draft: "",

  sidebarLines: [] as string[],
};

export function getWindow(n: number): WindowState {
  let win = state.windows.get(n);
  if (!win) {
    win = createWindow();
    state.windows.set(n, win);
  }
  return win;
}

export const MAX_BUFFER_LINES = 5000;
export const MAX_HISTORY = 100;
