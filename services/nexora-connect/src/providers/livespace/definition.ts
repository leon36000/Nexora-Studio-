import type { ProviderDefinition } from "../../core/types.ts";

import { livespaceActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "livespace",
  displayName: "Livespace",
  categories: ["Productivity", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "LIVESPACE_API_KEY",
      description:
        "Livespace API key sent with every API request. Find it in Account settings > API: https://support.livespace.io/en/articles/3572069-api-documentation-and-information.",
      extraFields: [
        {
          key: "apiSecret",
          label: "API Secret",
          inputType: "password",
          required: true,
          secret: true,
          placeholder: "LIVESPACE_API_SECRET",
          description:
            "Livespace API secret used locally to sign requests with SHA-1. Find it next to the API key in Account settings > API: https://support.livespace.io/en/articles/3572069-api-documentation-and-information.",
        },
        {
          key: "subdomain",
          label: "Subdomain",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "your-company",
          description:
            "Livespace workspace subdomain used to build https://<subdomain>.livespace.io. Use the subdomain from your Livespace workspace URL.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.livespace.io/",
  actions: livespaceActions,
};
