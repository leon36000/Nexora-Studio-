import type { ProviderDefinition } from "../../core/types.ts";

import { softrActions } from "./actions.ts";

const service = "softr";

export const provider: ProviderDefinition = {
  service,
  displayName: "Softr",
  categories: ["Productivity", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Personal Access Token",
      placeholder: "softr_personal_access_token",
      description:
        "Softr Personal Access Token used with the Softr-Api-Key header. Generate it in the Softr dashboard under My account > API Settings: https://docs.softr.io/softr-api/api-setup-and-endpoints.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://www.softr.io/",
  actions: softrActions,
};
