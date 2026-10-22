import type { ProviderDefinition } from "../../core/types.ts";

import { hubspotActions } from "./actions.ts";

const service = "hubspot";

/**
 * HubSpot provider backed by HubSpot MCP OAuth and MCP-native tools.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "HubSpot",
  categories: ["Marketing", "Productivity"],
  authTypes: ["oauth2"],
  auth: [
    {
      type: "oauth2",
      authorizationUrl: "https://mcp.hubspot.com/oauth/authorize/user",
      tokenUrl: "https://mcp.hubspot.com/oauth/v3/token",
      refreshTokenUrl: "https://mcp.hubspot.com/oauth/v3/token",
      scopes: [],
      tokenEndpointAuthMethod: "client_secret_post",
      tokenRequestFormat: "form",
      pkce: {
        method: "S256",
      },
    },
  ],
  homepageUrl: "https://www.hubspot.com",
  actions: hubspotActions,
};
