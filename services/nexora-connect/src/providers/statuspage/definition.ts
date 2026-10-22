import type { ProviderDefinition } from "../../core/types.ts";

import { statuspageActions } from "./actions.ts";

const service = "statuspage";

export const provider: ProviderDefinition = {
  service,
  displayName: "Statuspage",
  categories: ["Developer Tools", "Communication"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "STATUSPAGE_API_TOKEN",
      description:
        "Statuspage API token sent with the Authorization: OAuth header. Create or copy tokens from your Statuspage account API info page.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://www.atlassian.com/software/statuspage",
  actions: statuspageActions,
};
