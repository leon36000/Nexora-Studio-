import type { ProviderDefinition } from "../../core/types.ts";

import { mediastackActions } from "./actions.ts";

const service = "mediastack";

/**
 * Mediastack provider backed by the Mediastack news REST API.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "Mediastack",
  categories: ["Data", "Social"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "mediastack_api_key",
      description:
        "Mediastack API key sent with the access_key query parameter. Find it in https://mediastack.com/dashboard.",
    },
  ],
  homepageUrl: "https://mediastack.com",
  actions: mediastackActions,
};
