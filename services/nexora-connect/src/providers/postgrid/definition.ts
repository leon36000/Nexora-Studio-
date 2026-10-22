import type { ProviderDefinition } from "../../core/types.ts";

import { postgridActions } from "./actions.ts";

const service = "postgrid";

export const provider: ProviderDefinition = {
  service,
  displayName: "PostGrid",
  categories: ["Communication", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "POSTGRID_API_KEY",
      description:
        "PostGrid Print & Mail API key sent with the x-api-key request header. Create or copy it from your PostGrid dashboard: https://dashboard.postgrid.com/.",
    },
  ],
  homepageUrl: "https://www.postgrid.com",
  actions: postgridActions,
};
