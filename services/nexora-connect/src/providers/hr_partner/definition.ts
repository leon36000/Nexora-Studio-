import type { ProviderDefinition } from "../../core/types.ts";

import { hrPartnerActions } from "./actions.ts";

const service = "hr_partner";

export const provider: ProviderDefinition = {
  service,
  displayName: "HR Partner",
  description: "Read HR Partner company, employee, lookup, job, applicant, and application data.",
  categories: ["Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "hr_partner_api_key",
      description:
        "HR Partner API key sent with the x-api-key header. Generate or manage API keys from your HR Partner account's API settings: https://developer.hrpartner.io/#authentication",
    },
  ],
  homepageUrl: "https://www.hrpartner.io/",
  actions: hrPartnerActions,
};
