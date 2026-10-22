import type { ProviderDefinition } from "../../core/types.ts";

import { simlaActions } from "./actions.ts";

const service = "simla";

export const provider: ProviderDefinition = {
  service,
  displayName: "Simla.com",
  categories: ["Marketing", "Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "simla_api_key",
      description:
        "Simla API key sent with the X-API-KEY request header. Create or view keys in the Integration section under API access keys: https://docs.simla.com/Users/Integration/APIEditing.",
      extraFields: [
        {
          key: "apiBaseUrl",
          label: "API Base URL",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "https://your-account.simla.com",
          description:
            "Your Simla account base URL, for example https://demo.simla.com. The connector appends /api/v5 paths automatically: https://docs.simla.com/Developers/API/APIFeatures/APIRules.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.simla.com/en",
  actions: simlaActions,
};
