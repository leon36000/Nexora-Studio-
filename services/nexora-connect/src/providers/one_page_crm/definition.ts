import type { ProviderDefinition } from "../../core/types.ts";

import { onePageCrmActions } from "./actions.ts";

const service = "one_page_crm";

export const provider: ProviderDefinition = {
  service,
  displayName: "OnePageCRM",
  categories: ["Marketing"],
  authTypes: ["custom_credential"],
  auth: [
    {
      type: "custom_credential",
      fields: [
        {
          key: "userId",
          label: "User ID",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "ONEPAGECRM_USER_ID",
          description:
            "OnePageCRM user_id used as the Basic Auth username. Find it in your OnePageCRM API configuration tab after signing in: https://app.onepagecrm.com/app/api.",
        },
        {
          key: "apiKey",
          label: "API Key",
          inputType: "password",
          required: true,
          secret: true,
          placeholder: "ONEPAGECRM_API_KEY",
          description:
            "OnePageCRM API key used as the Basic Auth password. View or regenerate it in your OnePageCRM API configuration tab: https://app.onepagecrm.com/app/api.",
        },
      ],
      testAction: {
        actionName: "list_contacts",
        input: {
          perPage: 1,
        },
      },
    },
  ],
  homepageUrl: "https://www.onepagecrm.com",
  actions: onePageCrmActions,
};
