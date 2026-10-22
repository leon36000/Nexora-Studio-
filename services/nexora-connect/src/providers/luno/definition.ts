import type { ProviderDefinition } from "../../core/types.ts";

import { lunoActions } from "./actions.ts";
export const provider: ProviderDefinition = {
  service: "luno",
  displayName: "Luno",
  categories: ["Finance", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key Secret",
      placeholder: "LUNO_API_KEY_SECRET",
      description:
        "Luno API Key Secret from Profile > Security > API keys: https://www.luno.com/wallet/settings/api_keys",
      extraFields: [
        {
          key: "keyId",
          label: "API Key ID",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "LUNO_API_KEY_ID",
          description: "Luno API Key ID used as the HTTP Basic username.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.luno.com",
  actions: lunoActions,
};
