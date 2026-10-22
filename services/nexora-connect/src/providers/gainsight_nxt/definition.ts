import type { ProviderDefinition } from "../../core/types.ts";

import { gainsightNxtActions } from "./actions.ts";

const service = "gainsight_nxt";

export const provider: ProviderDefinition = {
  service,
  displayName: "Gainsight NXT",
  categories: ["Marketing", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Access Key",
      placeholder: "GAINSIGHT_ACCESS_KEY",
      description:
        "Gainsight NXT REST API Access Key sent in the Accesskey header. Generate it from Administration > Connectors 2.0 > Create Connection > Gainsight API > Access_Key: https://support.gainsight.com/gainsight_nxt/Connectors/API_Integrations/Generate_REST_API_Key.",
      extraFields: [
        {
          key: "baseUrl",
          label: "API Base URL",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "https://companyapi.gainsightcloud.com",
          description:
            "Your Gainsight NXT tenant or custom API domain used in Company API endpoint URLs, such as https://companyapi.gainsightcloud.com or https://companyapi.yourcompany.com.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.gainsight.com",
  actions: gainsightNxtActions,
};
