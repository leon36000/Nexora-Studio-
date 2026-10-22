import type { ProviderDefinition } from "../../core/types.ts";

import { vatlayerActions } from "./actions.ts";

const service = "vatlayer";

export const provider: ProviderDefinition = {
  service,
  displayName: "VATlayer",
  categories: ["Finance", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Access Key",
      placeholder: "VATLAYER_API_KEY",
      description: "The vatlayer API access key sent with the access_key query parameter.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://vatlayer.com",
  actions: vatlayerActions,
};
