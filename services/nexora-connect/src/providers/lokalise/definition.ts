import type { ProviderDefinition } from "../../core/types.ts";

import { lokaliseActions } from "./actions.ts";

const service = "lokalise";

export const provider: ProviderDefinition = {
  service,
  displayName: "Lokalise",
  categories: ["Productivity", "Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "LOKALISE_API_TOKEN",
      description:
        "Lokalise API token sent in the X-Api-Token header. Create or copy a token from Profile settings > API tokens; Lokalise documents this at https://developers.lokalise.com/reference/api-authentication.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://lokalise.com",
  actions: lokaliseActions,
};
