import type { ProviderDefinition } from "../../core/types.ts";

import { honeycombActions } from "./actions.ts";

const service = "honeycomb";

/**
 * Honeycomb provider backed by the Honeycomb API.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "Honeycomb",
  categories: ["Developer Tools", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Configuration API Key",
      placeholder: "HONEYCOMB_API_KEY",
      description:
        "Honeycomb Configuration API key sent in the X-Honeycomb-Team header. Create or view environment API keys in Honeycomb Environment Settings.",
      extraFields: [
        {
          key: "apiBaseUrl",
          label: "API Base URL",
          inputType: "text",
          required: false,
          secret: false,
          placeholder: "https://api.honeycomb.io",
          description: "Optional Honeycomb regional API base URL. Use https://api.eu1.honeycomb.io for EU accounts.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.honeycomb.io/",
  actions: honeycombActions,
};
