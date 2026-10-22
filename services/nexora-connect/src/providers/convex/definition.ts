import type { ProviderDefinition } from "../../core/types.ts";

import { convexActions } from "./actions.ts";

const service = "convex";

export const provider: ProviderDefinition = {
  service,
  displayName: "Convex",
  categories: ["Developer Tools"],
  authTypes: ["oauth2", "api_key"],
  auth: [
    {
      type: "oauth2",
      authorizationUrl: "https://dashboard.convex.dev/oauth/authorize/team",
      tokenUrl: "https://api.convex.dev/oauth/token",
      scopes: [],
      tokenEndpointAuthMethod: "client_secret_post",
      authorizationParams: {},
    },
    {
      type: "api_key",
      label: "Deploy Key",
      placeholder: "convex_deploy_key",
      description:
        "Convex deploy key used with the Authorization Bearer header. Create it from Deployment Settings in the Convex dashboard as documented at https://docs.convex.dev/production/access-tokens.",
    },
  ],
  homepageUrl: "https://www.convex.dev",
  actions: convexActions,
};
