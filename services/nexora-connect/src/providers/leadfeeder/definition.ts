import type { ProviderDefinition } from "../../core/types.ts";

import { leadfeederActions } from "./actions.ts";

const service = "leadfeeder";

export const provider: ProviderDefinition = {
  service,
  displayName: "Leadfeeder",
  categories: ["Marketing", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "LEADFEEDER_API_KEY",
      description:
        "Leadfeeder API key sent with the X-Api-Key header. Create it in Leadfeeder under Settings > Personal > API Keys.",
    },
  ],
  homepageUrl: "https://www.leadfeeder.com",
  actions: leadfeederActions,
};
