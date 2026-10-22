import type { ProviderDefinition } from "../../core/types.ts";

import { octaveActions } from "./actions.ts";

const service = "octave";

export const provider: ProviderDefinition = {
  service,
  displayName: "Octave",
  categories: ["AI", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "octave_api_key",
      description:
        "Octave workspace API key sent with the api_key header. Create or view it in Octave under Settings > API Keys: https://app.octavehq.com.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://www.octavehq.com/",
  actions: octaveActions,
};
