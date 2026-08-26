import { clr } from "../protocol/ansi";

export interface TuiState {
  windows: Map<number, WindowState>;
  currentWindow: number;
  statusText: string;
  savedPrompt: string;
}

export interface WindowState {
  logLines: string[];
  wrappedRows: string[];
}

const createWindow = (): WindowState => ({
  logLines: [],
  wrappedRows: [],
});

export const defPrompt = clr("D") + "Bylinter> " + clr("0");

export function defaultState(): TuiState {
  return {
    windows: new Map<number, WindowState>([[1, createWindow()]]),
    currentWindow: 1,
    statusText: "Not connected",
    savedPrompt: defPrompt,
  };
}
