import type { ProviderDefinition } from "../../core/types.ts";

import { clariCopilotActions } from "./actions.ts";

const service = "clari_copilot";

export const provider: ProviderDefinition = {
  service,
  displayName: "Clari Copilot",
  categories: ["Data", "Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "CLARI_COPILOT_API_KEY",
      description:
        "Clari Copilot API key sent with the X-Api-Key header. Find it in workspace settings > integrations > Clari Copilot API: https://api-doc.copilot.clari.com/",
      extraFields: [
        {
          key: "apiPassword",
          label: "API Password",
          inputType: "password",
          required: true,
          secret: true,
          placeholder: "CLARI_COPILOT_API_PASSWORD",
          description:
            "Clari Copilot API password sent with the X-Api-Password header. Find it next to the API key in workspace settings > integrations > Clari Copilot API: https://api-doc.copilot.clari.com/",
        },
      ],
    },
  ],
  homepageUrl: "https://www.clari.com/products/copilot/",
  actions: clariCopilotActions,
};
