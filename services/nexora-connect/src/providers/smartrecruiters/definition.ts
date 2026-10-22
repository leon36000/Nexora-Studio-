import type { ProviderDefinition } from "../../core/types.ts";

import { smartrecruitersActions } from "./actions.ts";

const service = "smartrecruiters";

export const provider: ProviderDefinition = {
  service,
  displayName: "SmartRecruiters",
  categories: ["Productivity", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "SMARTRECRUITERS_API_KEY",
      description:
        "SmartRecruiters API key sent with the X-SmartToken header. Generate it in Credential Manager under custom applications: https://www.smartrecruiters.com/settings/administration/app-management/custom-applications",
    },
  ],
  homepageUrl: "https://www.smartrecruiters.com/",
  actions: smartrecruitersActions,
};
