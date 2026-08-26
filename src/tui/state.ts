export interface TuiState {
  currentWindow: number,
  windows: Map<number, WindowState>,
  statusText: string,
  currentPrompt: string,
  inputBuffer: string,
  cursorPos: number,
  history: string[],
  historyPos: number,
  draft: string,
  sidebarLines: string[],
}

export interface WindowState {
  logLines: string[];
  wrappedRows: string[];
  rowCounts: number[];
  wrapWidth: number;
  scrollOffset: number;
}

export const state: TuiState = {
  currentWindow: 1,
  windows: new Map<number, WindowState>([[1, createWindow()]]),
  statusText: "Not connected",
  currentPrompt: "",
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

function createWindow(): WindowState {
  return {
    logLines: [],
    wrappedRows: [],
    rowCounts: [],
    wrapWidth: 0,
    scrollOffset: 0,
  };
}

export const MAX_BUFFER_LINES = 10000;
export const MAX_HISTORY = 100;
