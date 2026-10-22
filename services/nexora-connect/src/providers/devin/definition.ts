import type { ProviderDefinition } from "../../core/types.ts";

import { devinActions } from "./actions.ts";

const service = "devin";

export const provider: ProviderDefinition = {
  service,
  displayName: "Devin",
  categories: ["AI", "Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Service User API Key",
      placeholder: "cog_xxxxxxxxxx",
      description:
        "Devin service user API key sent in the Authorization Bearer header. Create a service user and generate its API key from Devin Settings > Service users: https://docs.devin.ai/api-reference/authentication.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://devin.ai",
  actions: devinActions,
};
