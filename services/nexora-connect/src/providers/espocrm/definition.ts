import type { ProviderDefinition } from "../../core/types.ts";

import { espocrmActions } from "./actions.ts";

const service = "espocrm";

export const provider: ProviderDefinition = {
  service,
  displayName: "EspoCRM",
  categories: ["Productivity", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "API_KEY_COPIED_FROM_THE_USER_DETAIL_VIEW",
      description:
        "EspoCRM API key sent with the X-Api-Key request header. Create an API User in Administration > API Users and copy the API key from that user's detail view: https://docs.espocrm.com/development/api/",
      extraFields: [
        {
          key: "baseUrl",
          label: "Site URL",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "https://crm.example.com",
          description: "Site URL of your EspoCRM instance, the same URL you open in the browser to use EspoCRM.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.espocrm.com/",
  actions: espocrmActions,
};
