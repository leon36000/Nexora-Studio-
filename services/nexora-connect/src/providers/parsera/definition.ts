import type { ProviderDefinition } from "../../core/types.ts";

import { parseraActions } from "./actions.ts";

const service = "parsera";

export const provider: ProviderDefinition = {
  service,
  displayName: "Parsera",
  categories: ["Data", "Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "PARSERA_API_KEY",
      description:
        "Parsera API key sent in the X-API-KEY header. Create or copy it from your Parsera account after signing in: https://parsera.org/app.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://parsera.org",
  actions: parseraActions,
};
