import type { ProviderDefinition } from "../../core/types.ts";

import { quipteamsActions } from "./actions.ts";

const service = "quipteams";

export const provider: ProviderDefinition = {
  service,
  displayName: "Quipteams",
  categories: ["Productivity", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "QUIPTEAMS_API_KEY",
      description:
        "Quipteams API key sent as a Bearer token. Get or request an API key from your Quipteams account or contact Quipteams support: https://api.quipteams.com/docs",
    },
  ],
  homepageUrl: "https://www.quipteams.com",
  actions: quipteamsActions,
};
