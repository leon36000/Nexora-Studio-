import type { ProviderDefinition } from "../../core/types.ts";

import { dropcontactActions } from "./actions.ts";

const service = "dropcontact";

export const provider: ProviderDefinition = {
  service,
  displayName: "Dropcontact",
  categories: ["Data", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "DROPCONTACT_API_KEY",
      description:
        "Dropcontact access token sent in the X-Access-Token header. Subscribe for API access and retrieve your token through the official developer documentation: https://developer.dropcontact.com/.",
    },
  ],
  homepageUrl: "https://www.dropcontact.com/",
  actions: dropcontactActions,
};
