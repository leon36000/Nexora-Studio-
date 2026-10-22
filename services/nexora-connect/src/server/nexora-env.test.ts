import { describe, expect, it } from "vitest";
import { applyNexoraEnvAliases, assertEncryptionConfigured } from "./nexora-env.ts";

describe("applyNexoraEnvAliases", () => {
  it("copies NEXORA_CONNECT_* settings onto the variables the runtime reads", () => {
    const env: Record<string, string | undefined> = {
      NEXORA_CONNECT_ENCRYPTION_KEY: "k",
      NEXORA_CONNECT_ORIGIN: "https://connect.example",
    };
    applyNexoraEnvAliases(env);
    expect(env.OOMOL_CONNECT_ENCRYPTION_KEY).toBe("k");
    expect(env.OOMOL_CONNECT_ORIGIN).toBe("https://connect.example");
  });

  it("never overrides a variable that is already set", () => {
    const env: Record<string, string | undefined> = {
      NEXORA_CONNECT_ADMIN_TOKEN: "new",
      OOMOL_CONNECT_ADMIN_TOKEN: "existing",
    };
    applyNexoraEnvAliases(env);
    expect(env.OOMOL_CONNECT_ADMIN_TOKEN).toBe("existing");
  });

  it("ignores blank values", () => {
    const env: Record<string, string | undefined> = { NEXORA_CONNECT_DATA_DIR: "  " };
    applyNexoraEnvAliases(env);
    expect(env.OOMOL_CONNECT_DATA_DIR).toBeUndefined();
  });
});

describe("assertEncryptionConfigured", () => {
  it("refuses to start without an encryption key", () => {
    expect(() => assertEncryptionConfigured({})).toThrow(/NEXORA_CONNECT_ENCRYPTION_KEY/);
  });

  it("accepts a configured key", () => {
    expect(() => assertEncryptionConfigured({ OOMOL_CONNECT_ENCRYPTION_KEY: "secret" })).not.toThrow();
  });

  it("allows an explicit plaintext opt-out for local development only", () => {
    expect(() => assertEncryptionConfigured({ NEXORA_CONNECT_ALLOW_PLAINTEXT: "1" })).not.toThrow();
  });
});
