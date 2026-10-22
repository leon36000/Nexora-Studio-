import type { ProviderDefinition } from "../../core/types.ts";

import { owlProtocolActions } from "./actions.ts";

const service = "owl_protocol";

export const provider: ProviderDefinition = {
  service,
  displayName: "Owl Protocol",
  categories: ["Developer Tools", "Finance"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "OWL_PROTOCOL_API_KEY",
      description:
        "Owl Protocol API key sent with the x-api-key header. Sign up from the official quickstart, then copy the key shown for your project: https://docs.owlprotocol.xyz/quickstart.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://owlprotocol.xyz",
  actions: owlProtocolActions,
};
