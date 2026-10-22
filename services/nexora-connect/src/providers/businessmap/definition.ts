import type { ProviderDefinition } from "../../core/types.ts";

import { businessmapActions } from "./actions.ts";

const service = "businessmap";

export const provider: ProviderDefinition = {
  service,
  displayName: "Businessmap",
  categories: ["Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "businessmap_api_key",
      description:
        "Businessmap API key sent with the apikey header. Find or generate it in Businessmap from My Account > API: https://knowledgebase.businessmap.io/hc/en-us/articles/360012393692-Businessmap-REST-API.",
      extraFields: [
        {
          key: "accountUrl",
          label: "Account URL",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "https://your-account.kanbanize.com",
          description: "Your Businessmap account host used to build https://<account>.kanbanize.com/api/v2 requests.",
        },
      ],
    },
  ],
  homepageUrl: "https://businessmap.io",
  actions: businessmapActions,
};
