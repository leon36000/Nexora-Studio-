import type { ProviderDefinition } from "../../core/types.ts";

import { mapleBillingActions } from "./actions.ts";

const service = "maple_billing";

/**
 * Measure billing provider backed by the public Measure API.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "Measure",
  categories: ["Finance"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "MEASURE_API_TOKEN",
      description:
        "Measure API token sent as a Bearer token. Create an API token in the Measure dashboard under Developers > API Token: https://docs.getmeasure.com/pages/guides/quickstart-with-api.",
      extraFields: [
        {
          key: "companyId",
          label: "Company ID",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "cmp_...",
          description:
            "The Measure company ID with the cmp_ prefix used in API paths. The Measure API quickstart shows this as COMPANY_ID: https://docs.getmeasure.com/pages/guides/quickstart-with-api.",
        },
      ],
    },
  ],
  homepageUrl: "https://getmeasure.com",
  actions: mapleBillingActions,
};
