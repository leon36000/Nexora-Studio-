import type { ProviderDefinition } from "../../core/types.ts";

import { securitytrailsActions } from "./actions.ts";

const service = "securitytrails";

export const provider: ProviderDefinition = {
  service,
  displayName: "SecurityTrails",
  categories: ["Security", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "SECURITYTRAILS_API_KEY",
      description:
        "SecurityTrails API key sent with the APIKEY header. Create or view it on your credentials page: https://securitytrails.com/app/account/credentials",
    },
  ],
  homepageUrl: "https://securitytrails.com",
  actions: securitytrailsActions,
};
