import { describe, expect, it } from "vitest";
import {
  buildHttpClientSetup,
  buildHttpFirstAction,
  buildMcpClientConfig,
  normalizeGatewayUrl,
} from "./client-onboarding";

describe("client gateway setup", () => {
  it("preserves a reverse-proxy prefix and rejects URLs clients cannot connect to", () => {
    expect(normalizeGatewayUrl(" https://connect.example.com/gateway/ ")).toBe("https://connect.example.com/gateway");
    for (const url of [
      "localhost:3000",
      "file:///tmp/gateway",
      "https://user:secret@example.com",
      "https://example.com?q=1",
      "https://example.com/#fragment",
      "https://example.com/?",
      "https://example.com/#",
    ]) {
      expect(normalizeGatewayUrl(url)).toBeUndefined();
    }
  });
  it("uses the same gateway and adds authentication only when selected", () => {
    const baseUrl = "https://connect.example.com/gateway";
    const authenticated = JSON.parse(buildMcpClientConfig(baseUrl, true));
    const anonymous = JSON.parse(buildMcpClientConfig(baseUrl, false));
    expect(authenticated.mcpServers["nexora-connect"]).toEqual({
      url: `${baseUrl}/mcp`,
      headers: { Authorization: "Bearer <RUNTIME_TOKEN>" },
    });
    expect(anonymous.mcpServers["nexora-connect"]).toEqual({ url: `${baseUrl}/mcp` });
    expect(buildHttpClientSetup(baseUrl, true)).toContain(`NEXORA_CONNECT_URL='${baseUrl}'`);
    expect(buildHttpClientSetup(baseUrl, false)).toContain("unset NEXORA_CONNECT_RUNTIME_TOKEN");
    expect(buildHttpFirstAction(true)).toContain("Authorization: Bearer $NEXORA_CONNECT_RUNTIME_TOKEN");
    expect(buildHttpFirstAction(false)).not.toContain("Authorization");
  });
  it("quotes gateway URLs as literal shell values", () => {
    const baseUrl = "https://example.com/a'b$(echo example)";
    expect(buildHttpClientSetup(baseUrl, true)).toContain("'https://example.com/a'\\''b$(echo example)'");
  });
  it("calls the /v1 search, schema and execution routes", () => {
    const example = buildHttpFirstAction(true);
    expect(example).toContain('"$NEXORA_CONNECT_URL/v1/actions/search?q=top%20stories"');
    expect(example).toContain('-X POST "$NEXORA_CONNECT_URL/v1/actions/hackernews.get_top_stories"');
    expect(example).toContain(`-d '{"input":{}}'`);
  });
});
