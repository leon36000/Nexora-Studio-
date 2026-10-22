import type { ProviderDefinition } from "../../core/types.ts";

import { userflowActions } from "./actions.ts";

const service = "userflow";

export const provider: ProviderDefinition = {
  service,
  displayName: "Userflow",
  categories: ["Data", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "ak_us1_xxxx",
      description: "Userflow API key used as a bearer token. Create or view API keys in Userflow workspace settings.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://userflow.com",
  actions: userflowActions,
};
