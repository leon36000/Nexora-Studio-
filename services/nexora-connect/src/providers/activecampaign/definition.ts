import type { ProviderDefinition } from "../../core/types.ts";

import { activecampaignActions } from "./actions.ts";

const service = "activecampaign";

export const provider: ProviderDefinition = {
  service,
  displayName: "ActiveCampaign",
  categories: ["Marketing", "Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "act_...",
      description:
        "ActiveCampaign API token sent with the Api-Token request header. Find it on the Developer settings page: https://help.activecampaign.com/hc/en-us/articles/207317590-Getting-started-with-the-API.",
      extraFields: [
        {
          key: "apiUrl",
          label: "API URL",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "https://your-account.api-us1.com",
          description:
            "ActiveCampaign API URL such as https://your-account.api-us1.com. URLs ending in /api/3 are also accepted.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.activecampaign.com",
  actions: activecampaignActions,
};
