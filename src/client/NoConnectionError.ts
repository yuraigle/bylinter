export class NoConnectionError extends Error {
    constructor(message: string) {
        super(message);
    }
}