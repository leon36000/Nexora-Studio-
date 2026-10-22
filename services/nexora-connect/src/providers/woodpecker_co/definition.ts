import type { ProviderDefinition } from "../../core/types.ts";

import { woodpeckerCoActions } from "./actions.ts";

const service = "woodpecker_co";

export const provider: ProviderDefinition = {
  service,
  displayName: "Woodpecker.co",
  categories: ["Communication", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "WOODPECKER_API_KEY",
      description:
        "Woodpecker.co API key sent in the x-api-key header. Create it from Add-ons > API & Integrations > API keys or open the official API keys view: https://app.woodpecker.co/panel#add-ons/integrations/api-keys",
    },
  ],
  homepageUrl: "https://woodpecker.co/",
  actions: woodpeckerCoActions,
};
