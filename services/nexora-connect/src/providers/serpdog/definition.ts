import type { ProviderDefinition } from "../../core/types.ts";

import { serpdogActions } from "./actions.ts";

const service = "serpdog";

export const provider: ProviderDefinition = {
  service,
  displayName: "Serpdog",
  categories: ["Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "SERPDOG_API_KEY",
      description:
        "Serpdog API key passed as the api_key query parameter. The official Account API docs show it in the account_info response: https://docs.serpdog.io/account-api.",
    },
  ],
  homepageUrl: "https://serpdog.io",
  actions: serpdogActions,
};
