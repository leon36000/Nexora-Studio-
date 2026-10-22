import type { ProviderDefinition } from "../../core/types.ts";

import { juniperMistActions } from "./actions.ts";

const service = "juniper_mist";
const juniperMistDefaultApiBaseUrl = "https://api.mist.com/api/v1";

export const provider: ProviderDefinition = {
  service,
  displayName: "Juniper Mist",
  categories: ["Security", "Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "JUNIPER_MIST_API_TOKEN",
      description:
        "Juniper Mist API token sent with the Authorization: Token header. Create it from the Mist portal API Token page: https://api-class.mist.com/rest/createapitoken/",
      extraFields: [
        {
          key: "apiBaseUrl",
          label: "API Base URL",
          inputType: "text",
          required: false,
          secret: false,
          placeholder: juniperMistDefaultApiBaseUrl,
          description:
            "Optional Juniper Mist API base URL for your cloud region, such as https://api.mist.com/api/v1 or https://api.eu.mist.com/api/v1.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.juniper.net/us/en/products/networking/mist-ai.html",
  actions: juniperMistActions,
};
