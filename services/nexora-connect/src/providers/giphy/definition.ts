import type { ProviderDefinition } from "../../core/types.ts";

import { giphyActions } from "./actions.ts";

const service = "giphy";

/**
 * GIPHY provider backed by the public GIPHY API.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "GIPHY",
  categories: ["Design & Media", "Social"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "giphy_api_key",
      description:
        "GIPHY API key passed as the api_key query parameter. Create an app in the GIPHY Developer Dashboard: https://developers.giphy.com/dashboard/.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://giphy.com",
  actions: giphyActions,
};
