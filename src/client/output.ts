export type OutputSink = (text: string, isolated?: boolean) => void;

const sinks = new Set<OutputSink>();

export function addOutputSink(sink: OutputSink): () => void {
  sinks.add(sink);
  return () => sinks.delete(sink);
}

export function broadcast(text: string, isolated = false): void {
  for (const sink of sinks) {
    sink(text, isolated);
  }
}
