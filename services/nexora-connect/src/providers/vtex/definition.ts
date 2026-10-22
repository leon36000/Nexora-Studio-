import type { ProviderDefinition } from "../../core/types.ts";

import { vtexActions } from "./actions.ts";

const service = "vtex";

export const provider: ProviderDefinition = {
  service,
  displayName: "VTEX",
  categories: ["Marketing", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "App Key",
      placeholder: "VTEX_APP_KEY",
      description:
        "VTEX API app key sent in the X-VTEX-API-AppKey header. Create and manage API keys in Account settings as described in the VTEX API key guide: https://developers.vtex.com/docs/guides/api-authentication-using-api-keys.",
      extraFields: [
        {
          key: "appToken",
          label: "App Token",
          inputType: "password",
          required: true,
          secret: true,
          placeholder: "VTEX_APP_TOKEN",
          description:
            "VTEX API app token paired with the app key and sent in the X-VTEX-API-AppToken header. Copy it when creating or rotating the API key in VTEX Account settings: https://developers.vtex.com/docs/guides/api-authentication-using-api-keys.",
        },
        {
          key: "accountName",
          label: "Account name",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "apiexamples",
          description:
            "VTEX account name used in the API hostname, for example apiexamples in https://apiexamples.vtexcommercestable.com.br.",
        },
        {
          key: "environment",
          label: "Environment",
          inputType: "text",
          required: false,
          secret: false,
          placeholder: "vtexcommercestable",
          description:
            "VTEX environment segment used in the API hostname. Leave empty to use the documented default vtexcommercestable environment.",
        },
      ],
    },
  ],
  homepageUrl: "https://vtex.com",
  actions: vtexActions,
};
