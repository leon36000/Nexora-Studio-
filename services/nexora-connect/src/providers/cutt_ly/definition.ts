import type { ProviderDefinition } from "../../core/types.ts";

import { cuttLyActions } from "./actions.ts";

const service = "cutt_ly";

export const provider: ProviderDefinition = {
  service,
  displayName: "Cuttly",
  categories: ["Marketing", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "CUTTLY_API_KEY",
      description:
        "Cuttly API key passed with the key query parameter. Generate it from the Edit Account page described in the API docs: https://cutt.ly/api-documentation/cuttly-links-api",
    },
  ],
  homepageUrl: "https://cutt.ly",
  actions: cuttLyActions,
};
