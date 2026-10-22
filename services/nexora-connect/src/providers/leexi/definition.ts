import type { ProviderDefinition } from "../../core/types.ts";

import { leexiActions } from "./actions.ts";

const service = "leexi";

/**
 * Leexi provider backed by the public Leexi API.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "Leexi",
  categories: ["Productivity", "Communication"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Key Secret",
      placeholder: "LEEXI_KEY_SECRET",
      description:
        "Leexi Key Secret used together with your API Key ID through HTTP Basic Authentication. Generate both values in Leexi Settings > Company Settings > API Keys: https://app.leexi.ai/settings/api_keys",
      extraFields: [
        {
          key: "keyId",
          label: "API Key ID",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "LEEXI_KEY_ID",
          description:
            "Leexi API Key ID paired with the Key Secret for HTTP Basic Authentication. Copy it from Leexi Settings > Company Settings > API Keys: https://app.leexi.ai/settings/api_keys",
        },
      ],
    },
  ],
  homepageUrl: "https://www.leexi.ai/",
  actions: leexiActions,
};
