import type { ProviderDefinition } from "../../core/types.ts";

import { energyPerformanceCertificatesActions } from "./actions.ts";

const service = "energy_performance_certificates";

export const provider: ProviderDefinition = {
  service,
  displayName: "Energy Performance Certificates",
  categories: ["Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Bearer Token",
      placeholder: "epc_bearer_token",
      description:
        "Energy Performance Certificates bearer token used with the Authorization header. Sign in and copy it from your GOV.UK EPC data account page: https://get-energy-performance-data.communities.gov.uk/api/my-account.",
    },
  ],
  homepageUrl: "https://get-energy-performance-data.communities.gov.uk",
  actions: energyPerformanceCertificatesActions,
};
