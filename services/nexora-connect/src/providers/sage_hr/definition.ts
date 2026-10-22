import type { ProviderDefinition } from "../../core/types.ts";

import { sageHrActions } from "./actions.ts";

const service = "sage_hr";

export const provider: ProviderDefinition = {
  service,
  displayName: "Sage HR",
  categories: ["Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "SAGE_HR_API_KEY",
      description:
        "Sage HR API key sent with the X-Auth-Token header. Enable the API and copy the key from Settings > Integrations > API in Sage HR: https://support.sage.hr/en/articles/3246469-how-does-cakehr-api-work.",
      extraFields: [
        {
          key: "domain",
          label: "Domain",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "acme or acme.sage.hr",
          description: "Your Sage HR company subdomain. If your portal is acme.sage.hr, enter acme or acme.sage.hr.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.sage.com/en-us/sage-business-cloud/people/",
  actions: sageHrActions,
};
