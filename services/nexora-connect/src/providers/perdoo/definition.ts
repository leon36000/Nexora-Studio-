import type { ProviderDefinition } from "../../core/types.ts";

import { perdooActions } from "./actions.ts";

const service = "perdoo";

export const provider: ProviderDefinition = {
  service,
  displayName: "Perdoo",
  categories: ["Productivity", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "perdoo_api_token",
      description:
        "Perdoo API token sent as a Bearer token. Create it in Personal Settings > API Tokens: https://web.perdoo.com/settings/user/api-tokens.",
    },
  ],
  homepageUrl: "https://www.perdoo.com",
  actions: perdooActions,
};
