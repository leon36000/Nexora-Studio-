import type { ProviderDefinition } from "../../core/types.ts";

import { partnerStackPartnerActions } from "./actions.ts";

const service = "partner_stack_partner";

export const provider: ProviderDefinition = {
  service,
  displayName: "PartnerStack Partner",
  categories: ["Marketing", "Finance"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "PARTNERSTACK_PARTNER_API_KEY",
      description:
        "PartnerStack Partner API key sent with the Authorization Bearer header. Find it in the Partner dashboard under Settings -> API: https://docs.partnerstack.com/reference/partner-api-authentication.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://partnerstack.com",
  actions: partnerStackPartnerActions,
};
