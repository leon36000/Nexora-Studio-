import type { ProviderDefinition } from "../../core/types.ts";

import { ringoverActions } from "./actions.ts";

const service = "ringover";

export const provider: ProviderDefinition = {
  service,
  displayName: "Ringover",
  categories: ["Communication", "Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "RINGOVER_API_KEY",
      description:
        "Ringover API key sent with the Authorization header. Create it in the Ringover Dashboard under Developer > API Keys: https://app.ringover.com.",
      extraFields: [
        {
          key: "region",
          label: "Region",
          inputType: "text",
          required: false,
          secret: false,
          placeholder: "eu",
          description:
            "Ringover public API region for requests. Use eu for https://public-api.ringover.com/v2 or us for https://public-api-us.ringover.com/v2. Leave empty for eu.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.ringover.com/",
  actions: ringoverActions,
};
