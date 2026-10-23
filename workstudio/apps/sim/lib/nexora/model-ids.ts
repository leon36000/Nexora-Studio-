/** The Nexora API alias that names the deployment's default chat model. */
const DEFAULT_MODEL_ALIAS = 'nexora-default'

/**
 * Model ids offered to blocks, from Nexora API's `/v1/models`: every router name and every alias
 * (the default model is the router carrying `nexora-default`), prefixed `vllm/`, the default alias
 * first and each id once.
 */
export function listedModelIds(models: ReadonlyArray<{ id: string; aliases?: unknown }>): string[] {
  const names: string[] = []
  for (const model of models) {
    const aliases = Array.isArray(model.aliases) ? model.aliases : []
    for (const name of [model.id, ...aliases]) {
      if (typeof name === 'string' && name.trim() && !names.includes(name)) names.push(name)
    }
  }
  const ordered = names.includes(DEFAULT_MODEL_ALIAS)
    ? [DEFAULT_MODEL_ALIAS, ...names.filter((name) => name !== DEFAULT_MODEL_ALIAS)]
    : names
  return ordered.map((name) => `vllm/${name}`)
}
