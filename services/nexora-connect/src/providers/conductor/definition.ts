import type { ProviderDefinition } from "../../core/types.ts";

import { conductorActions } from "./actions.ts";

const service = "conductor";

/**
 * Conductor provider backed by the public Conductor Monitoring Reporting API.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "Conductor",
  categories: ["Marketing", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Reporting API Token",
      placeholder: "CONDUCTOR_REPORTING_API_TOKEN",
      description:
        "Conductor Monitoring Reporting API token sent in the Authorization header. Find it in Conductor Monitoring under Account > Integration Tokens: https://support.conductor.com/en_US/conductor-monitoring-apis/conductor-monitoring-reporting-api",
    },
  ],
  homepageUrl: "https://www.conductor.com",
  actions: conductorActions,
};
