import type { ProviderDefinition } from "../../core/types.ts";

import { agentyActions } from "./actions.ts";

const service = "agenty";

export const provider: ProviderDefinition = {
  service,
  displayName: "Agenty",
  categories: ["Developer Tools", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "agenty_api_key",
      description:
        "Agenty API key used with the X-Agenty-ApiKey header. Manage it from Agenty API Keys docs: https://agenty.com/docs/api-keys/88.",
    },
  ],
  homepageUrl: "https://agenty.com",
  actions: agentyActions,
};
