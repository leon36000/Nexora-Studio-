import type { ProviderDefinition } from "../../core/types.ts";

import { gladiaActions } from "./actions.ts";

const service = "gladia";

/**
 * Gladia provider backed by Gladia's v2 transcription API.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "Gladia",
  categories: ["AI", "Design & Media"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "gladia_api_key",
      description:
        "Gladia API key sent with the x-gladia-key header. Create or copy it from the Gladia dashboard API Keys page: https://app.gladia.io/settings/api-keys",
      extraFields: [],
    },
  ],
  homepageUrl: "https://app.gladia.io/",
  actions: gladiaActions,
};
