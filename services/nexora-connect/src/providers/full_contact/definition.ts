import type { ProviderDefinition } from "../../core/types.ts";

import { fullContactActions } from "./actions.ts";

const service = "full_contact";

export const provider: ProviderDefinition = {
  service,
  displayName: "FullContact",
  categories: ["Marketing", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "FULLCONTACT_API_KEY",
      description:
        "FullContact API key sent as an Authorization Bearer token. Create or view keys in the FullContact developer portal: https://platform.fullcontact.com/developers/api-keys.",
    },
  ],
  homepageUrl: "https://www.fullcontact.com/",
  actions: fullContactActions,
};
