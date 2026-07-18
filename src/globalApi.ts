import * as clientApi from "./client";

export type BylinterApi = typeof clientApi;

declare global {
  var bylinter: BylinterApi;
}

export function exposeGlobalApi(): void {
  (globalThis as any).bylinter = clientApi;
}
