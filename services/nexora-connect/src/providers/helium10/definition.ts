import type { ProviderDefinition } from "../../core/types.ts";

import { helium10Actions, helium10ProviderScopes } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "helium10",
  displayName: "Helium 10",
  categories: ["Data", "Marketing"],
  authTypes: ["oauth2"],
  auth: [
    {
      type: "oauth2",
      authorizationUrl: "https://members.helium10.com/authhub/api/scenarios/mcp/oauth2/authorize",
      tokenUrl: "https://members.helium10.com/authhub/api/scenarios/mcp/oauth2/token",
      refreshTokenUrl: "https://members.helium10.com/authhub/api/scenarios/mcp/oauth2/token",
      scopes: [helium10ProviderScopes.tools],
      tokenEndpointAuthMethod: "none",
      pkce: { method: "S256" },
      authorizationParams: { resource: "https://mcp.helium10.com/mcp" },
    },
  ],
  homepageUrl: "https://www.helium10.com",
  actions: helium10Actions,
};
