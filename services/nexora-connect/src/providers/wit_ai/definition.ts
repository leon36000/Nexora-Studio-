import type { ProviderDefinition } from "../../core/types.ts";

import { witAiActions } from "./actions.ts";

const service = "wit_ai";

export const provider: ProviderDefinition = {
  service,
  displayName: "Wit.ai",
  categories: ["AI", "Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Wit.ai API Token",
      placeholder: "Bearer token from Wit.ai Settings",
      description:
        "Wit.ai Bearer token used to access the HTTP API. Create or open your app at https://wit.ai/apps and copy the Server Access Token from the app settings.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://wit.ai",
  actions: witAiActions,
};
