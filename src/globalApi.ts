import type { GlobalApiContext } from "./types/bylinter-api.d.ts";

import { clr, stripColors } from "./protocol/ansi";
import { MudSession } from "./core/MudSession.js";
import { TerminalUI } from "./tui/TerminalUI";
import {
    AliasCollection,
    BindkeyCollection,
    TriggerCollection,
    PromptHookCollection,
    MsdpHookCollection,
    SubstituteCollection
} from "./logic";

export function exposeGlobalApi(
  session: MudSession,
  tui: TerminalUI,
  aliases: AliasCollection,
  bindkeys: BindkeyCollection,
  triggers: TriggerCollection,
  substitutes: SubstituteCollection,
  promptHooks: PromptHookCollection,
  msdpHooks: MsdpHookCollection,
): void {
  const api: GlobalApiContext = {
    connect: session.connect,
    disconnect: session.disconnect,
    sendRaw: session.sendText,
    sendMsdp: session.sendMsdp,

    echo: tui.echo,
    showme: tui.showme,
    showerr: tui.showerr,
    wecho: tui.wecho,
    setSidebar: tui.setSidebar,

    registerTrigger: triggers.register,
    registerPromptHook: promptHooks.register,
    registerMsdpHook: msdpHooks.register,
    registerSubstitute: substitutes.register,
    registerAlias: aliases.register,
    registerBindkey: bindkeys.register,

    stripColors: stripColors,
    clr: clr,
  };

  Object.defineProperty(globalThis, 'bylinter', {
    value: api,
    writable: false,
    configurable: true,
  });
}
