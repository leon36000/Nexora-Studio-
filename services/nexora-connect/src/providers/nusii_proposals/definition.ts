import type { ProviderDefinition } from "../../core/types.ts";

import { nusiiProposalsActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "nusii_proposals",
  displayName: "Nusii Proposals",
  categories: ["Productivity", "Communication"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "NUSII_API_KEY",
      description:
        "Nusii API token sent in the Authorization header. Create or view tokens in Nusii Settings > API: https://app.nusii.com/settings/api.",
    },
  ],
  homepageUrl: "https://nusii.com/",
  actions: nusiiProposalsActions,
};
