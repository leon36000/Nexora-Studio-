import type { ProviderDefinition } from "../../core/types.ts";

import { dixaActions } from "./actions.ts";

const service = "dixa";

export const provider: ProviderDefinition = {
  service,
  displayName: "Dixa",
  categories: ["Communication", "Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "dixa_api_token",
      description:
        "Dixa API token sent with the Authorization header. Administrators can create it in Dixa under Settings > Manage > Integrations > API Tokens: https://docs.dixa.io/docs/tutorial-create-an-api-token.",
    },
  ],
  homepageUrl: "https://www.dixa.com",
  actions: dixaActions,
};
