import type { ProviderDefinition } from "../../core/types.ts";

import { renderformActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "renderform",
  displayName: "RenderForm",
  categories: ["Design & Media", "Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "RENDERFORM_API_KEY",
      description:
        "RenderForm API key used with the X-API-KEY header. Create or copy it from the RenderForm API Keys tab: https://renderform.io/console/account/api-keys",
    },
  ],
  homepageUrl: "https://renderform.io",
  actions: renderformActions,
};
