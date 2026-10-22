import type { ProviderDefinition } from "../../core/types.ts";

import { workosActions } from "./actions.ts";

const service = "workos";

export const provider: ProviderDefinition = {
  service,
  displayName: "WorkOS",
  categories: ["Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "WORKOS_API_KEY",
      description:
        "WorkOS secret API key sent as a Bearer token. View and manage keys in the WorkOS Dashboard: https://dashboard.workos.com/api-keys.",
    },
  ],
  homepageUrl: "https://workos.com",
  actions: workosActions,
};
