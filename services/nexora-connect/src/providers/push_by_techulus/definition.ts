import type { ProviderDefinition } from "../../core/types.ts";

import { pushByTechulusActions } from "./actions.ts";

const service = "push_by_techulus";

/**
 * Push by Techulus provider backed by the public notification API.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "Push by Techulus",
  categories: ["Communication", "Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "PUSH_BY_TECHULUS_API_KEY",
      description:
        "Push by Techulus account or team API key sent with the x-api-key header. Find account keys on the console integrations page at https://push.techulus.com/console/integrations; team keys are shown in the team details screen.",
    },
  ],
  homepageUrl: "https://push.techulus.com",
  actions: pushByTechulusActions,
};
