import type { ProviderDefinition } from "../../core/types.ts";

import { insitesActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "insites",
  displayName: "Insites",
  categories: ["Marketing", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "YOUR_INSITES_API_KEY",
      description: "Insites API key sent with the api-key header. Manage it at https://app.insites.com/.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://insites.com",
  actions: insitesActions,
};
