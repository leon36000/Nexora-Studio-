import type { ProviderDefinition } from "../../core/types.ts";

import { liveagentActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "liveagent",
  displayName: "LiveAgent",
  categories: ["Communication", "Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "LIVEAGENT_API_KEY",
      description:
        "LiveAgent API key sent in the apikey header. Generate or copy an API key from the LiveAgent admin panel: https://support.liveagent.com/741982-API-key.",
      extraFields: [
        {
          key: "baseUrl",
          label: "LiveAgent Account URL",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "https://your-account.ladesk.com",
          description:
            "The root URL of your LiveAgent account, such as https://your-account.ladesk.com or your custom LiveAgent domain.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.liveagent.com",
  actions: liveagentActions,
};
