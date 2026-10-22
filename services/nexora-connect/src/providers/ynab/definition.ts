import type { ProviderDefinition } from "../../core/types.ts";

import { ynabActions } from "./actions.ts";

const service = "ynab";

export const provider: ProviderDefinition = {
  service,
  displayName: "YNAB",
  categories: ["Finance"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Personal Access Token",
      placeholder: "YNAB personal access token",
      description:
        "YNAB personal access token sent with the Authorization Bearer header. Create one from Developer Settings: https://app.ynab.com/settings/developer.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://www.ynab.com",
  actions: ynabActions,
};
