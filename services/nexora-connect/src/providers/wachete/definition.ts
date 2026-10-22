import type { ProviderDefinition } from "../../core/types.ts";

import { wacheteActions } from "./actions.ts";

const service = "wachete";

export const provider: ProviderDefinition = {
  service,
  displayName: "Wachete",
  categories: ["Developer Tools", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "WACHETE_API_KEY",
      description:
        "Wachete API key used to create a short-lived API token. Copy it from your Wachete user profile: https://www.wachete.com/api.",
      extraFields: [
        {
          key: "userId",
          label: "User ID",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "WACHETE_USER_ID",
          description:
            "Wachete user ID paired with the API key during API login. Copy it from your Wachete user profile: https://www.wachete.com/api.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.wachete.com/",
  actions: wacheteActions,
};
