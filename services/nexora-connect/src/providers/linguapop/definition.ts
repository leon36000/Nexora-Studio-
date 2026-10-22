import type { ProviderDefinition } from "../../core/types.ts";

import { linguapopActions } from "./actions.ts";

const service = "linguapop";

export const provider: ProviderDefinition = {
  service,
  displayName: "Linguapop",
  categories: ["Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Integration API Key",
      placeholder: "LINGUAPOP_INTEGRATION_API_KEY",
      description:
        "Linguapop integration API key sent in the sendInvitation request body. Organization admins can add integrations and view or refresh API keys in Linguapop Integrations: https://docs.linguapop.eu/integrations/.",
    },
  ],
  homepageUrl: "https://www.linguapop.eu/",
  actions: linguapopActions,
};
