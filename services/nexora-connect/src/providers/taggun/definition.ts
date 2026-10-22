import type { ProviderDefinition } from "../../core/types.ts";

import { taggunActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "taggun",
  displayName: "Taggun",
  categories: ["AI", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "TAGGUN_API_KEY",
      description:
        "Taggun API key sent with the apikey header. Sign up for a Taggun account and receive the key by email: https://www.taggun.io/register.",
    },
  ],
  homepageUrl: "https://www.taggun.io/",
  actions: taggunActions,
};
