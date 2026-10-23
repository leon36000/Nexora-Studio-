/** `ollama/bge-m3` and `ollama/bge-m3:latest` name the same embedding model. */
export function isSameEmbeddingModel(left: string, right: string): boolean {
  const canonical = (model: string) =>
    model
      .trim()
      .toLowerCase()
      .replace(/:latest$/, '')
  return canonical(left) === canonical(right)
}
