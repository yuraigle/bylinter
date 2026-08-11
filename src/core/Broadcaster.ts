export type TextConsumer = (text: string, hasGA?: boolean) => void;

export class Broadcaster {
  private readonly consumers: Set<TextConsumer> = new Set<TextConsumer>();

  public addConsumer = (cb: TextConsumer): (() => void) => {
    this.consumers.add(cb);
    return () => this.consumers.delete(cb);
  };

  public broadcast = (text: string, hasGA = false): void => {
    for (const consumer of this.consumers) {
      consumer(text, hasGA);
    }
  };
}
