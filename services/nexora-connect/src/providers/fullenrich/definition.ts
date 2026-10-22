import type { ProviderDefinition } from "../../core/types.ts";

import { fullenrichActions } from "./actions.ts";

const service = "fullenrich";

export const provider: ProviderDefinition = {
  service,
  displayName: "FullEnrich",
  categories: ["Data", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "FULLENRICH_API_KEY",
      description:
        "FullEnrich API key used with the Authorization Bearer header. Create or copy it from the FullEnrich API page: https://app.fullenrich.com/app/api.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://www.fullenrich.com",
  actions: fullenrichActions,
};
