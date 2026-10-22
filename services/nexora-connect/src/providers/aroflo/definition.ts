import type { ProviderDefinition } from "../../core/types.ts";

import { arofloActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "aroflo",
  displayName: "AroFlo",
  categories: ["Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "AF.12345xyz",
      description:
        "AroFlo API token sent as a Bearer credential. Generate it from Site Admin > AroFlo API: https://docs.api.aroflo.com/guides/authentication/.",
    },
  ],
  homepageUrl: "https://aroflo.com",
  actions: arofloActions,
};
