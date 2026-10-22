import type { ProviderDefinition } from "../../core/types.ts";

import { breezeActions } from "./actions.ts";

const service = "breeze";

export const provider: ProviderDefinition = {
  service,
  displayName: "Breeze",
  categories: ["Productivity", "Communication"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "breeze_api_key",
      description:
        "Breeze API key sent with the Api-key header. Generate or copy it from your Breeze account's API page: https://app.breezechms.com/api.",
      extraFields: [
        {
          key: "subdomain",
          label: "Church Subdomain",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "yourchurch",
          description:
            "Breeze church subdomain used to build https://<subdomain>.breezechms.com API requests. Use the same church web address shown on the Breeze Login screen.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.breezechms.com",
  actions: breezeActions,
};
