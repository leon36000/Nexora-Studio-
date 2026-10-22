import type { ProviderDefinition } from "../../core/types.ts";

import { signalbaseActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "signalbase",
  displayName: "Signalbase",
  categories: ["Data", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "Signalbase API key",
      description:
        "Signalbase API key used as a bearer token. Get it from the Signalbase dashboard API page: https://www.trysignalbase.com/workspace/api.",
    },
  ],
  homepageUrl: "https://www.trysignalbase.com",
  actions: signalbaseActions,
};
