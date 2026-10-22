/** Accepts a client-reachable gateway base URL, including a reverse-proxy path prefix. */
export function normalizeGatewayUrl(value: string): string | undefined {
  try {
    const url = new URL(value.trim());
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.href.includes("?") ||
      url.href.includes("#")
    )
      return undefined;
    return url.toString().replace(/\/+$/, "");
  } catch {
    return undefined;
  }
}

/** Quote example values for a POSIX shell without evaluating substitutions. */
export function shellSingleQuote(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

export function buildMcpClientConfig(baseUrl: string, authenticated: boolean): string {
  const server: { url: string; headers?: Record<string, string> } = { url: `${baseUrl}/mcp` };
  if (authenticated) server.headers = { Authorization: "Bearer <RUNTIME_TOKEN>" };
  return JSON.stringify({ mcpServers: { "nexora-connect": server } }, null, 2);
}

/** Shell variables the HTTP examples read, so the gateway address and token are typed once. */
export function buildHttpClientSetup(baseUrl: string, authenticated: boolean): string {
  return [
    `export NEXORA_CONNECT_URL=${shellSingleQuote(baseUrl)}`,
    authenticated ? "export NEXORA_CONNECT_RUNTIME_TOKEN='<RUNTIME_TOKEN>'" : "unset NEXORA_CONNECT_RUNTIME_TOKEN",
  ].join("\n");
}

/** Searches the catalog, reads one action schema, then executes it through the `/v1` runtime API. */
export function buildHttpFirstAction(authenticated: boolean): string {
  const auth = authenticated ? ' -H "Authorization: Bearer $NEXORA_CONNECT_RUNTIME_TOKEN"' : "";
  return [
    `curl -s "$NEXORA_CONNECT_URL/v1/actions/search?q=top%20stories"${auth}`,
    `curl -s "$NEXORA_CONNECT_URL/v1/actions/hackernews.get_top_stories"${auth}`,
    `curl -s -X POST "$NEXORA_CONNECT_URL/v1/actions/hackernews.get_top_stories"${auth} \\`,
    "  -H 'content-type: application/json' -d '{\"input\":{}}'",
  ].join("\n");
}
