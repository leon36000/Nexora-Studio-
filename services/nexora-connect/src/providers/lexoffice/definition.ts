import type { ProviderDefinition } from "../../core/types.ts";

import { lexofficeActions } from "./actions.ts";

const service = "lexoffice";

export const provider: ProviderDefinition = {
  service,
  displayName: "lexoffice",
  categories: ["Finance", "Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "lexoffice_api_key",
      description:
        "lexoffice Public API key sent with the Authorization Bearer header. Create or view it in the lexoffice developer area: https://app.lexware.de/addons/public-api",
    },
  ],
  homepageUrl: "https://office.lexware.de/",
  actions: lexofficeActions,
};
