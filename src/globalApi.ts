import * as clientApi from "./client";

declare global {
  var bylinter: typeof clientApi;
}

export function exposeGlobalApi(): void {
  (globalThis as any).bylinter = clientApi;
}
