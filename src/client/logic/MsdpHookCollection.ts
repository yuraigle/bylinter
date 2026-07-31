export class MsdpHookCollection {
    private readonly msdpHooks: MsdpHandler[] = [];

    public register = (handler: MsdpHandler): void => {
        this.msdpHooks.push(handler);
    }

    public dispatch = (data: Record<string, unknown>): void => {
        for (const hook of this.msdpHooks) {
            hook(data);
        }
    }
}

export type MsdpHandler = (data: Record<string, unknown>) => void;
