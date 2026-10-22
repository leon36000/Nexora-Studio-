import type { ProviderDefinition } from "../../core/types.ts";

import { pipedreamActions } from "./actions.ts";

const service = "pipedream";

export const provider: ProviderDefinition = {
  service,
  displayName: "Pipedream",
  categories: ["Developer Tools", "Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key or Access Token",
      description:
        "Pipedream Bearer credential used with the REST API. Copy a user API key from https://pipedream.com/user or create an OAuth client in https://pipedream.com/settings/api and exchange it for an access token.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://pipedream.com",
  actions: pipedreamActions,
};
