import type { ProviderDefinition } from "../../core/types.ts";

import { lightfieldActions } from "./actions.ts";

const service = "lightfield";

export const provider: ProviderDefinition = {
  service,
  displayName: "Lightfield",
  categories: ["Productivity", "AI"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "sk_lf_...",
      description:
        "Lightfield API key sent as a Bearer token. Admins can create and revoke keys from the Lightfield API keys settings page: https://crm.lightfield.app/crm/settings/api-keys.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://lightfield.app",
  actions: lightfieldActions,
};
