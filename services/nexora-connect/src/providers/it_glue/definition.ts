import type { ProviderDefinition } from "../../core/types.ts";

import { itGlueActions } from "./actions.ts";

const service = "it_glue";

export const provider: ProviderDefinition = {
  service,
  displayName: "IT Glue",
  categories: ["Productivity", "Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "ITG.**************************",
      description:
        "IT Glue API key sent with the x-api-key header. Create API keys in IT Glue under Account > Settings > API Keys: https://help.itglue.kaseya.com/help/Content/1-admin/it-glue-api/getting-started-with-the-it-glue-api.html",
      extraFields: [
        {
          key: "region",
          label: "Data Center",
          inputType: "text",
          required: false,
          secret: false,
          placeholder: "us",
          description:
            "Optional IT Glue data center for the API key. Use us for api.itglue.com, eu for api.eu.itglue.com, or au for api.au.itglue.com.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.itglue.com/",
  actions: itGlueActions,
};
