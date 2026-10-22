import type { ProviderDefinition } from "../../core/types.ts";

import { prerenderActions } from "./actions.ts";

const service = "prerender";

export const provider: ProviderDefinition = {
  service,
  displayName: "Prerender",
  categories: ["Marketing", "Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "PRERENDER_API_TOKEN",
      description:
        "Prerender API token sent as prerenderToken in REST API requests. Copy it from Account Settings in the Prerender dashboard: https://dashboard.prerender.io/",
    },
  ],
  homepageUrl: "https://prerender.io",
  actions: prerenderActions,
};
