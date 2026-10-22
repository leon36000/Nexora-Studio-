import type { ProviderDefinition } from "../../core/types.ts";

import { griptapeActions } from "./actions.ts";

/**
 * Griptape provider backed by the Griptape Cloud API.
 */
export const provider: ProviderDefinition = {
  service: "griptape",
  displayName: "Griptape",
  categories: ["AI"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "GRIPTAPE_API_KEY",
      description:
        "Griptape Cloud API key used as a Bearer token in the Authorization header. Create or view keys in Griptape Cloud: https://cloud.griptape.ai/configuration/api-keys.",
    },
  ],
  homepageUrl: "https://www.griptape.ai",
  actions: griptapeActions,
};
