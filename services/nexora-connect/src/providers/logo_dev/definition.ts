import type { ProviderDefinition } from "../../core/types.ts";

import { logoDevActions } from "./actions.ts";

const service = "logo_dev";

export const provider: ProviderDefinition = {
  service,
  displayName: "Logo.dev",
  categories: ["Design & Media", "Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Secret Key",
      placeholder: "sk_xxx",
      description:
        "Logo.dev secret key used for search and describe requests. Create it in the API Keys dashboard and do not use a publishable key: https://www.logo.dev/dashboard/api-keys.",
    },
  ],
  homepageUrl: "https://logo.dev",
  actions: logoDevActions,
};
