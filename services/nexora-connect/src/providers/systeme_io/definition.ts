import type { ProviderDefinition } from "../../core/types.ts";

import { systemeIoActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "systeme_io",
  displayName: "Systeme.io",
  categories: ["Marketing", "Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "SYSTEME_IO_API_KEY",
      description:
        "Systeme.io API key passed as the X-API-Key header. Create and manage API keys from account settings.",
    },
  ],
  homepageUrl: "https://systeme.io",
  actions: systemeIoActions,
};
