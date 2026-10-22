import type { ProviderDefinition } from "../../core/types.ts";

import { renderActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "render",
  displayName: "Render",
  categories: ["Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "render_api_key",
      description:
        "Render API key used with the Authorization Bearer header. Create and manage it from Account Settings in the Render Dashboard: https://render.com/docs/api.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://render.com",
  actions: renderActions,
};
