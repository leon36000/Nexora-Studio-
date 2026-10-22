import type { ProviderDefinition } from "../../core/types.ts";

import { higgsfieldAiActions } from "./actions.ts";

const service = "higgsfield_ai";

export const provider: ProviderDefinition = {
  service,
  displayName: "Higgsfield AI",
  categories: ["AI", "Design & Media"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "HIGGSFIELD_API_KEY",
      description:
        "Higgsfield API key used with the Authorization: Key header. Create API credentials from the Higgsfield Cloud dashboard: https://cloud.higgsfield.ai.",
      extraFields: [
        {
          key: "apiSecret",
          label: "API Secret",
          inputType: "password",
          required: true,
          secret: true,
          placeholder: "HIGGSFIELD_API_SECRET",
          description:
            "Higgsfield API secret paired with the API key for Authorization: Key authentication. Create API credentials from the Higgsfield Cloud dashboard: https://cloud.higgsfield.ai.",
        },
      ],
    },
  ],
  homepageUrl: "https://higgsfield.ai/",
  actions: higgsfieldAiActions,
};
