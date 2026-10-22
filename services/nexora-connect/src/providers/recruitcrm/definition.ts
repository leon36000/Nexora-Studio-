import type { ProviderDefinition } from "../../core/types.ts";

import { recruitcrmActions } from "./actions.ts";

const service = "recruitcrm";

export const provider: ProviderDefinition = {
  service,
  displayName: "Recruit CRM",
  categories: ["Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "recruitcrm_api_token",
      description:
        "Recruit CRM API token used with the Authorization Bearer header. Get it from Recruit CRM Admin Settings; the official authentication guide is https://docs.recruitcrm.io/docs/rcrm-api-reference/ZG9jOjExMDcyMQ-authentication.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://recruitcrm.io",
  actions: recruitcrmActions,
};
