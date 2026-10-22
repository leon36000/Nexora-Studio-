import type { ProviderDefinition } from "../../core/types.ts";

import { recruiteeActions } from "./actions.ts";

const service = "recruitee";

export const provider: ProviderDefinition = {
  service,
  displayName: "Recruitee",
  categories: ["Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "recruitee_api_token",
      description:
        "Recruitee personal API token used with the Authorization Bearer header. Create it in Settings > Apps and plugins > Personal API Tokens: https://app.recruitee.com/#/settings/api_tokens.",
      extraFields: [
        {
          key: "companyId",
          label: "Company ID",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "1111",
          description:
            "Recruitee company ID or company subdomain used in /c/{company_id}/... API paths. Find it on the Personal API Tokens settings page.",
        },
      ],
    },
  ],
  homepageUrl: "https://recruitee.com",
  actions: recruiteeActions,
};
