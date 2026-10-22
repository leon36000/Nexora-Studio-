import type { ProviderDefinition } from "../../core/types.ts";

import { textmagicActions } from "./actions.ts";

const service = "textmagic";

export const provider: ProviderDefinition = {
  service,
  displayName: "Textmagic",
  categories: ["Communication", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "TEXTMAGIC_API_KEY",
      description:
        "Textmagic v2 API key used as the Basic Auth password. Create or view keys in Textmagic API settings: https://app.textmagic.com/settings/api.",
      extraFields: [
        {
          key: "username",
          label: "Username",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "TEXTMAGIC_USERNAME",
          description:
            "Textmagic username used as the Basic Auth username. Find it with your API keys in Textmagic API settings: https://app.textmagic.com/settings/api.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.textmagic.com/",
  actions: textmagicActions,
};
