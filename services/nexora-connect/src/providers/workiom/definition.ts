import type { ProviderDefinition } from "../../core/types.ts";

import { workiomActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "workiom",
  displayName: "Workiom",
  categories: ["Productivity", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "WORKIOM_API_KEY",
      description:
        "Workiom API key sent in the X-Api-Key header. Get it from Workiom Account Settings: https://help.workiom.com/article/workiom-api-guide",
      extraFields: [],
    },
  ],
  homepageUrl: "https://workiom.com",
  actions: workiomActions,
};
