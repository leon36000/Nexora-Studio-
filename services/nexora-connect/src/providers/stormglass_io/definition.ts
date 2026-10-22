import type { ProviderDefinition } from "../../core/types.ts";

import { stormglassIoActions } from "./actions.ts";

const service = "stormglass_io";

export const provider: ProviderDefinition = {
  service,
  displayName: "Stormglass",
  categories: ["Location", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "STORMGLASS_API_KEY",
      description:
        "Stormglass API key sent in the Authorization header. Copy the API key from the Stormglass dashboard.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://stormglass.io/",
  actions: stormglassIoActions,
};
