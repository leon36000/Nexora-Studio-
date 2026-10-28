import { describe, expect, it } from "vitest";
import { AesGcmSecretCodec, PlainTextSecretCodec } from "./secret-codec.ts";

describe("secret codecs", () => {
  it("round-trips encrypted payloads without storing plaintext", async () => {
    const codec = new AesGcmSecretCodec("test-key");
    const stored = await codec.encode('{"apiKey":"secret-token"}');

    expect(stored).toMatch(/^enc:v1:/);
    expect(stored).not.toContain("secret-token");
    await expect(codec.decode(stored)).resolves.toBe('{"apiKey":"secret-token"}');
  });

  it("rejects a truncated authentication tag instead of accepting a weaker forgery check", async () => {
    const codec = new AesGcmSecretCodec("test-key");
    const stored = await codec.encode('{"apiKey":"secret-token"}');
    const [prefix, iv, tag, encrypted] = /^(enc:v1:)([^.]+)\.([^.]+)\.(.+)$/.exec(stored)?.slice(1) ?? [];
    const shortTag = Buffer.from(tag ?? "", "base64url")
      .subarray(0, 4)
      .toString("base64url");

    await expect(codec.decode(`${prefix}${iv}.${shortTag}.${encrypted}`)).rejects.toThrow();
  });

  it("keeps plaintext payloads readable for development mode", async () => {
    const codec = new PlainTextSecretCodec();

    await expect(codec.encode("value")).resolves.toBe("value");
    await expect(codec.decode("value")).resolves.toBe("value");
  });
});
