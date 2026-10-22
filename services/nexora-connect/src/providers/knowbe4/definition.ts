import type { ProviderDefinition } from "../../core/types.ts";

import { knowbe4Actions } from "./actions.ts";

const service = "knowbe4";

/**
 * KnowBe4 Reporting API provider.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "KnowBe4",
  categories: ["Security"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Reporting API Key",
      placeholder: "KNOWBE4_REPORTING_API_KEY",
      description:
        "KnowBe4 Reporting API key sent as a Bearer token. Generate it in the Reporting API Management Console: https://training.knowbe4.com/app/api_tokens/reporting.",
      extraFields: [
        {
          key: "region",
          label: "Region",
          inputType: "text",
          required: false,
          secret: false,
          placeholder: "us",
          description:
            "KnowBe4 account region for Reporting API calls. Use us, eu, ca, uk, or de based on your KnowBe4 console host.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.knowbe4.com",
  actions: knowbe4Actions,
};
