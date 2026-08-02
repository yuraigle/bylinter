import { GlobalApiContext } from "../types/bylinter-api";

import { clr, get_clr, stripColors } from "../protocol/ansi";
import { MudSession } from "./MudSession.js";
import { TerminalUI } from "../tui/TerminalUI";
import {
  AliasCollection,
  BindkeyCollection,
  TriggerCollection,
  PromptHookCollection,
  MsdpHookCollection,
  SubstituteCollection,
} from "../logic";

export class GlobalApi {
  public expose = (
    session: MudSession,
    tui: TerminalUI,
    aliases: AliasCollection,
    bindkeys: BindkeyCollection,
    triggers: TriggerCollection,
    substitutes: SubstituteCollection,
    promptHooks: PromptHookCollection,
    msdpHooks: MsdpHookCollection,
  ): GlobalApiContext => ({
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
    get_clr: get_clr,
  });
}
