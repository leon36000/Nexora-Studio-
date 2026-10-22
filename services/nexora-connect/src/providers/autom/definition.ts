import type { ProviderDefinition } from "../../core/types.ts";

import { automActions } from "./actions.ts";

const service = "autom";

export const provider: ProviderDefinition = {
  service,
  displayName: "Autom",
  categories: ["Data", "Developer Tools", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "AUTOM_API_KEY",
      description:
        "Autom API key sent with the x-api-key header. Create or copy it from the Autom dashboard API Keys page: https://app.autom.dev/",
    },
  ],
  homepageUrl: "https://www.autom.dev",
  actions: automActions,
};
