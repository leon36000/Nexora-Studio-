import type { ProviderDefinition } from "../../core/types.ts";

import { mondayActions } from "./actions.ts";
import { getMondayAuthorizationScopes } from "./scopes.ts";

const service = "monday";

export const provider: ProviderDefinition = {
  service,
  displayName: "Monday",
  categories: ["Productivity"],
  authTypes: ["oauth2", "api_key"],
  auth: [
    {
      type: "oauth2",
      authorizationUrl: "https://auth.monday.com/oauth2/authorize",
      tokenUrl: "https://auth.monday.com/oauth2/token",
      scopes: getMondayAuthorizationScopes(),
      tokenEndpointAuthMethod: "client_secret_post",
    },
    {
      type: "api_key",
      label: "Personal API Token",
      placeholder: "monday_personal_v2_token",
      description:
        "Monday personal V2 API token sent in the Authorization header with an explicit API-Version header. Find it in the monday Developer Center API token tab: https://developer.monday.com/api-reference/docs/authentication.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://monday.com",
  actions: mondayActions,
};
