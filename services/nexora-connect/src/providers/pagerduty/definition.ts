import type { ProviderDefinition } from "../../core/types.ts";

import { pagerDutyActions } from "./actions.ts";

const service = "pagerduty";

/**
 * PagerDuty provider backed by REST API tokens.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "PagerDuty",
  categories: ["Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "pdus+...",
      description:
        "PagerDuty REST API token used with the Authorization Token header. Create or view REST API tokens from PagerDuty Integrations > API Access Keys: https://support.pagerduty.com/main/docs/api-access-keys.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://www.pagerduty.com",
  actions: pagerDutyActions,
};
