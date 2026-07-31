import { state } from "./state";
import { enterScreen, exitScreen, redraw, appendLog, rewrapAll, wecho }
    from "./render";
import { initInput, destroyInput } from "./input";
import { clr } from "../protocol/ansi";
import { KeyInfo } from "../client/logic/BindkeyCollection";

export interface ITerminalUI {
    destroy(): void;
    log(text: string, isolated?: boolean): void;
    setStatus(text: string): void;
    setSidebar(lines: string[], start: number, end: number): void;

    echo(text: string): void;
    showme(text: string): void;
    showerr(text: string): void;
    wecho(w: number, text: string): void;
}

const prefix = `${clr('B')}-${clr('C')}:${clr('B')}-${clr('0')} `;

export class TerminalUI implements ITerminalUI {
    constructor(
        onInput: (line: string) => void,
        onKeyPress: (key: KeyInfo, str: string) => boolean
    ) {
        const echoAndInput = (line: string) => {
            this.echo(clr('L') + line + clr('0'));
            onInput(line);
        }

        initInput(echoAndInput, onKeyPress);
        enterScreen();
        rewrapAll();
        redraw();
    }

    public destroy = (): void => {
        exitScreen();
        destroyInput();
    }

    public log = (text: string, isolated = false): void => {
        appendLog(text, isolated);
    }

    public setStatus = (text: string): void => {
        state.statusText = text;
        redraw();
    }

    public setSidebar = (lines: string[], start: number, end: number): void => {
        const requiredLength = Math.max(state.sidebarLines.length, end + 1);
        if (state.sidebarLines.length < requiredLength) {
            state.sidebarLines = state.sidebarLines.concat(
                new Array(requiredLength - state.sidebarLines.length).fill(""),
            );
        }

        for (let i = start; i <= end; i++) {
            state.sidebarLines[i] = lines[i - start] ?? "";
        }

        redraw();
    }

    public echo = (message: string): void => {
        appendLog("\r\n" + message, true);
    }

    public showme = (message: string): void => {
        appendLog("\r\n" + prefix + message, true);
    }

    public showerr = (message: string): void => {
        this.showme(`${clr('B')}${message}${clr('0')}`);
    }

    public wecho = (w: number, text: string): void => {
        wecho(w, text);
    }
}