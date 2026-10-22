import type { ProviderDefinition } from "../../core/types.ts";

import { loyverseActions } from "./actions.ts";

const service = "loyverse";

export const provider: ProviderDefinition = {
  service,
  displayName: "Loyverse",
  categories: ["Finance", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Personal Access Token",
      placeholder: "LOYVERSE_PERSONAL_ACCESS_TOKEN",
      description:
        "Loyverse personal access token sent as Authorization: Bearer <token>. Create one in Loyverse Back Office integrations at https://r.loyverse.com/dashboard/#/integrations/tokens.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://loyverse.com/",
  actions: loyverseActions,
};
