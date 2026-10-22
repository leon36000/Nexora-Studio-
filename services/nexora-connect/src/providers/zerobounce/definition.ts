import type { ProviderDefinition } from "../../core/types.ts";

import { zerobounceActions } from "./actions.ts";

const service = "zerobounce";

export const provider: ProviderDefinition = {
  service,
  displayName: "ZeroBounce",
  categories: ["Communication", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "ZEROBOUNCE_API_KEY",
      description:
        "ZeroBounce API key sent with the api_key query parameter. Create your account at https://www.zerobounce.net/api/ and manage keys from your account settings.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://www.zerobounce.net",
  actions: zerobounceActions,
};
