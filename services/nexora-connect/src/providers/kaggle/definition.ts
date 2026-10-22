import type { ProviderDefinition } from "../../core/types.ts";

import { kaggleActions } from "./actions.ts";

const service = "kaggle";

export const provider: ProviderDefinition = {
  service,
  displayName: "Kaggle",
  categories: ["Data", "AI"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "KAGGLE_KEY",
      description:
        "Kaggle API key used with your Kaggle username for legacy API key authentication. Generate a token from Kaggle API settings: https://www.kaggle.com/settings/api.",
      extraFields: [
        {
          key: "username",
          label: "Username",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "KAGGLE_USERNAME",
          description:
            "Kaggle username paired with the API key. It is included in the kaggle.json token downloaded from Kaggle API settings: https://www.kaggle.com/settings/api.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.kaggle.com",
  actions: kaggleActions,
};
