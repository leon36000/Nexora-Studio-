import type { ProviderDefinition } from "../../core/types.ts";

import { booqableActions } from "./actions.ts";

const service = "booqable";

export const provider: ProviderDefinition = {
  service,
  displayName: "Booqable",
  categories: ["Productivity", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Access Token",
      placeholder: "BOOQABLE_ACCESS_TOKEN",
      description:
        "Booqable access token sent with the Authorization: Bearer header. Create access tokens from your Booqable account settings: https://developers.booqable.com/api/authentication.md.",
      extraFields: [
        {
          key: "companySlug",
          label: "Company Slug",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "your-company",
          description:
            "The Booqable company slug used to build https://<companySlug>.booqable.com/api/4 requests. Use only the subdomain before .booqable.com.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.booqable.com/",
  actions: booqableActions,
};
