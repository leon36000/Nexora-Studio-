import type { ProviderDefinition } from "../../core/types.ts";

import { leadmagicActions } from "./actions.ts";

const service = "leadmagic";

/**
 * LeadMagic provider backed by the public LeadMagic API.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "LeadMagic",
  categories: ["Marketing", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "LEADMAGIC_API_KEY",
      description:
        "LeadMagic API key used with the X-API-Key header. Create or view it in LeadMagic account settings: https://app.leadmagic.io/settings/api.",
    },
  ],
  homepageUrl: "https://leadmagic.io",
  actions: leadmagicActions,
};
