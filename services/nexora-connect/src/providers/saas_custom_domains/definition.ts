import type { ProviderDefinition } from "../../core/types.ts";

import { saasCustomDomainsActions } from "./actions.ts";

const service = "saas_custom_domains";

export const provider: ProviderDefinition = {
  service,
  displayName: "SaaS Custom Domains",
  categories: ["Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "SCD_API_TOKEN",
      description:
        "SaaS Custom Domains API token sent as a Bearer token. Create or copy it from Settings > API in the SaaS Custom Domains dashboard.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://saascustomdomains.com",
  actions: saasCustomDomainsActions,
};
