import type { ProviderDefinition } from "../../core/types.ts";

import { riveterActions } from "./actions.ts";

const service = "riveter";

export const provider: ProviderDefinition = {
  service,
  displayName: "Riveter",
  categories: ["AI", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "RIVETER_API_KEY",
      description:
        "Riveter API key used with the Authorization Bearer header. Create or manage API keys from the Riveter API Keys page.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://riveterhq.com",
  actions: riveterActions,
};
