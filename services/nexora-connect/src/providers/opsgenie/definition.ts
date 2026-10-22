import type { ProviderDefinition } from "../../core/types.ts";

import { opsgenieActions } from "./actions.ts";

const service = "opsgenie";

/**
 * Opsgenie provider backed by Alert API integration keys.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "Opsgenie",
  categories: ["Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "OPSGENIE_API_KEY",
      description:
        "Opsgenie API Integration key sent with the Authorization GenieKey header. Create an API Integration and copy its API key from Opsgenie Settings > Integrations: https://docs.opsgenie.com/docs/alert-api",
      extraFields: [
        {
          key: "environment",
          label: "Environment",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "us",
          description:
            "Opsgenie API region for this key. Use us for https://api.opsgenie.com or eu for https://api.eu.opsgenie.com.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.atlassian.com/software/opsgenie",
  actions: opsgenieActions,
};
