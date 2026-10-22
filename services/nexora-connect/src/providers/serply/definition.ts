import type { ProviderDefinition } from "../../core/types.ts";

import { serplyActions } from "./actions.ts";

const service = "serply";

export const provider: ProviderDefinition = {
  service,
  displayName: "Serply",
  categories: ["Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "SERPLY_API_KEY",
      description:
        "Serply API key sent in the X-Api-Key request header. View and manage it in the Serply Dashboard: https://app.serply.io.",
    },
  ],
  homepageUrl: "https://serply.io",
  actions: serplyActions,
};
