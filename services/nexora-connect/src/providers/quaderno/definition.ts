import type { ProviderDefinition } from "../../core/types.ts";

import { quadernoActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "quaderno",
  displayName: "Quaderno",
  categories: ["Finance", "Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "QUADERNO_API_KEY",
      description:
        "Quaderno API key used with HTTP Basic Auth. Create or view API keys in your Quaderno account: https://quadernoapp.com/users/api-keys",
    },
  ],
  homepageUrl: "https://quaderno.io/",
  actions: quadernoActions,
};
