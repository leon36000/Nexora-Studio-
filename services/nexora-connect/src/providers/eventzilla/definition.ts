import type { ProviderDefinition } from "../../core/types.ts";

import { eventzillaActions } from "./actions.ts";

const service = "eventzilla";

export const provider: ProviderDefinition = {
  service,
  displayName: "Eventzilla",
  categories: ["Productivity", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "eventzilla_api_key",
      description:
        "Eventzilla API key sent with the x-api-key header. Create it in Eventzilla under Settings > App Management.",
    },
  ],
  homepageUrl: "https://www.eventzilla.net",
  actions: eventzillaActions,
};
