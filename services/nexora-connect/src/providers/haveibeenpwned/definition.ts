import type { ProviderDefinition } from "../../core/types.ts";

import { haveibeenpwnedActions } from "./actions.ts";

const service = "haveibeenpwned";

export const provider: ProviderDefinition = {
  service,
  displayName: "Have I Been Pwned",
  categories: ["Security", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "HIBP_API_KEY",
      description:
        "Have I Been Pwned API key sent with the hibp-api-key request header. Buy or view it on the official API key page: https://haveibeenpwned.com/API/Key.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://haveibeenpwned.com/",
  actions: haveibeenpwnedActions,
};
