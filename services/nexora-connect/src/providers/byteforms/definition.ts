import type { ProviderDefinition } from "../../core/types.ts";

import { byteformsActions } from "./actions.ts";

const service = "byteforms";

export const provider: ProviderDefinition = {
  service,
  displayName: "ByteForms",
  categories: ["Productivity", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "byteforms_api_key",
      description:
        "ByteForms API key sent in the Authorization header without a Bearer prefix. Create it from Account > API Key: https://dev.forms.bytesuite.io/profile?tab=account&action=new_api_key.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://forms.bytesuite.io/",
  actions: byteformsActions,
};
