import type { ProviderDefinition } from "../../core/types.ts";

import { checkActions } from "./actions.ts";

const service = "check";

export const provider: ProviderDefinition = {
  service,
  displayName: "Check",
  categories: ["Finance", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "CHECK_API_KEY",
      description:
        "Check API key sent as an Authorization Bearer token. Use a sandbox or production key from your Check account.",
      extraFields: [
        {
          key: "environment",
          label: "Environment",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "sandbox or production",
          description:
            "The Check API environment for this key. Use sandbox for https://sandbox.checkhq.com or production for https://api.checkhq.com.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.checkhq.com",
  actions: checkActions,
};
