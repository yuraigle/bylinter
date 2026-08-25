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

export interface TuiLayout {
  width: number;
  height: number;
}

const createWindow = (): WindowState => ({
  logLines: [],
  wrappedRows: [],
});

export const defPrompt = clr("D") + "Bylinter> " + clr("0");

export const state: TuiState = {
  windows: new Map<number, WindowState>([[1, createWindow()]]),
  currentWindow: 1,
  statusText: "Not connected",
  savedPrompt: defPrompt,
};
