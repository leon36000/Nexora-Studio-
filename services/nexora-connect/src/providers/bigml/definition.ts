import type { ProviderDefinition } from "../../core/types.ts";

import { bigmlActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "bigml",
  displayName: "BigML",
  categories: ["AI", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "YOUR_BIGML_API_KEY",
      description: "BigML API key sent as the api_key query parameter. Copy it from https://bigml.com/account/apikey",
      extraFields: [
        {
          key: "username",
          label: "Username",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "your_bigml_username",
          description:
            "BigML username sent with every API request. Find it beside your API key at https://bigml.com/account/apikey",
        },
      ],
    },
  ],
  homepageUrl: "https://bigml.com/",
  actions: bigmlActions,
};
