export type TextConsumer = (text: string) => void;

export class Broadcaster {
    private readonly consumers: Set<TextConsumer> = new Set<TextConsumer>();

    // возвращает функцию для отписки
    public addConsumer = (cb: TextConsumer): () => void => {
        this.consumers.add(cb);
        return () => this.consumers.delete(cb);
    }

    // рассылает строку всем потребителям
    public broadcast = (text: string): void => {
        for (const consumer of this.consumers) {
            consumer(text);
        }
    }
}