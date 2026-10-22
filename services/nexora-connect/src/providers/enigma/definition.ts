import type { ProviderDefinition } from "../../core/types.ts";

import { enigmaActions } from "./actions.ts";

const service = "enigma";

export const provider: ProviderDefinition = {
  service,
  displayName: "Enigma",
  categories: ["Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "enigma_api_key",
      description:
        "Enigma API key sent with the x-api-key header. Create it from the Enigma API getting-started flow: https://developers.enigma.com/docs/getting-started.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://www.enigma.com",
  actions: enigmaActions,
};
