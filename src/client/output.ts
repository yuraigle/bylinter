export type OutputSink = (text: string) => void;

const sinks = new Set<OutputSink>();

export function addOutputSink(sink: OutputSink): () => void {
  sinks.add(sink);
  return () => sinks.delete(sink); // функция для отписки
}

export function broadcast(text: string): void {
  for (const sink of sinks) {
    sink(text);
  }
}
