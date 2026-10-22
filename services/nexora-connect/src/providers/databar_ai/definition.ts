import type { ProviderDefinition } from "../../core/types.ts";

import { databarAiActions } from "./actions.ts";

const service = "databar_ai";

export const provider: ProviderDefinition = {
  service,
  displayName: "Databar.ai",
  categories: ["Data", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "DATABAR_API_KEY",
      description: "Databar API key sent in the x-apikey header.",
    },
  ],
  homepageUrl: "https://databar.ai/",
  actions: databarAiActions,
};
