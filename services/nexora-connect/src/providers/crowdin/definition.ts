import type { ProviderDefinition } from "../../core/types.ts";

import { crowdinActions } from "./actions.ts";

const service = "crowdin";

export const provider: ProviderDefinition = {
  service,
  displayName: "Crowdin",
  categories: ["Productivity", "Communication"],
  authTypes: ["oauth2", "api_key"],
  auth: [
    {
      type: "oauth2",
      authorizationUrl: "https://accounts.crowdin.com/oauth/authorize",
      tokenUrl: "https://accounts.crowdin.com/oauth/token",
      scopes: ["project.settings", "project.source"],
      tokenEndpointAuthMethod: "client_secret_post",
    },
    {
      type: "api_key",
      label: "Personal Access Token",
      description:
        "Crowdin personal access token used with the Authorization Bearer header. Create or manage it at https://crowdin.com/settings#api-key.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://crowdin.com",
  actions: crowdinActions,
};
