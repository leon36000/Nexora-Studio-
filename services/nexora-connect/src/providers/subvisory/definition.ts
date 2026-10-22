import type { ProviderDefinition } from "../../core/types.ts";

import { subvisoryActions } from "./actions.ts";

const service = "subvisory";

export const provider: ProviderDefinition = {
  service,
  displayName: "Subvisory",
  categories: ["Finance"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "subvisory_api_key",
      description:
        "Subvisory API key sent with the X-API-Key header. Generate or copy it from Settings > API Keys in Subvisory: https://www.subvisory.com/api/v1/docs.",
    },
  ],
  homepageUrl: "https://www.subvisory.com",
  actions: subvisoryActions,
};
