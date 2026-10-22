import type { ProviderDefinition } from "../../core/types.ts";

import { goveeActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "govee",
  displayName: "Govee",
  categories: ["Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Govee API Key",
      placeholder: "GOVEE_API_KEY",
      description:
        "Govee API key sent with the Govee-API-Key header. Apply for a key in the Govee Home app from Settings > Apply for API Key: https://developer.govee.com/reference/apply-you-govee-api-key.",
    },
  ],
  homepageUrl: "https://www.govee.com",
  actions: goveeActions,
};
