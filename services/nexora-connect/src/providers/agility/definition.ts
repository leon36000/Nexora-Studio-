import type { ProviderDefinition } from "../../core/types.ts";

import { agilityActions } from "./actions.ts";

const service = "agility";

export const provider: ProviderDefinition = {
  service,
  displayName: "Agility CMS",
  categories: ["Developer Tools", "Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "AGILITY_CMS_API_KEY",
      description:
        "Agility CMS API key sent with the APIKey header. Find API keys and instance GUIDs in the API Keys section of your Agility CMS instance: https://agilitycms.com/docs/developers/content-fetch-api",
      extraFields: [
        {
          key: "guid",
          label: "Instance GUID",
          inputType: "text",
          required: false,
          secret: false,
          placeholder: "AGILITY_CMS_GUID",
          description:
            "Optional Agility CMS instance GUID used to validate the key against content models. Find it in the API Keys section of your Agility CMS instance: https://agilitycms.com/docs/developers/content-fetch-api",
        },
      ],
    },
  ],
  homepageUrl: "https://agilitycms.com/",
  actions: agilityActions,
};
