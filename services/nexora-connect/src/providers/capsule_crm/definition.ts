import type { ProviderDefinition } from "../../core/types.ts";

import { capsuleCrmActions } from "./actions.ts";

const service = "capsule_crm";

export const provider: ProviderDefinition = {
  service,
  displayName: "Capsule CRM",
  categories: ["Productivity", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Personal Access Token",
      placeholder: "capsule_personal_access_token",
      description:
        "Capsule CRM personal access token sent as Authorization: Bearer <token>. Create one from Capsule account settings.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://capsulecrm.com",
  actions: capsuleCrmActions,
};
