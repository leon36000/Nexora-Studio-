import type { ProviderDefinition } from "../../core/types.ts";

import { companyenrichActions } from "./actions.ts";

const service = "companyenrich";

/**
 * CompanyEnrich provider backed by the public CompanyEnrich API.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "CompanyEnrich",
  categories: ["Marketing", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "COMPANYENRICH_API_TOKEN",
      description:
        "CompanyEnrich API token used with the Authorization Bearer header. Register for an API key on the CompanyEnrich platform: https://docs.companyenrich.com/docs/getting-started",
    },
  ],
  homepageUrl: "https://companyenrich.com",
  actions: companyenrichActions,
};
