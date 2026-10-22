type Env = Record<string, string | undefined>;

const NEXORA_PREFIX = "NEXORA_CONNECT_";
const RUNTIME_PREFIX = "OOMOL_CONNECT_";

/**
 * Nexora edition: operators configure the service with `NEXORA_CONNECT_*` variables.
 * The runtime still reads its upstream names, so each alias is copied onto them
 * unless the upstream name is already set.
 */
export function applyNexoraEnvAliases(env: Env): void {
  for (const [name, value] of Object.entries(env)) {
    if (!name.startsWith(NEXORA_PREFIX) || !value?.trim()) continue;
    const target = RUNTIME_PREFIX + name.slice(NEXORA_PREFIX.length);
    if (env[target] === undefined) env[target] = value;
  }
}

/**
 * Nexora edition: stored credentials are always encrypted. Starting without a key is
 * refused unless `NEXORA_CONNECT_ALLOW_PLAINTEXT=1` is set for local development.
 */
export function assertEncryptionConfigured(env: Env): void {
  if (env.OOMOL_CONNECT_ENCRYPTION_KEY?.trim()) return;
  if (env.NEXORA_CONNECT_ALLOW_PLAINTEXT === "1") return;
  throw new Error(
    "NEXORA_CONNECT_ENCRYPTION_KEY is required: Nexora Connect encrypts stored credentials. Generate one with `openssl rand -base64 32`.",
  );
}
