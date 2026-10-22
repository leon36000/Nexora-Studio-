import type { ProviderDefinition } from "../../core/types.ts";

import { censysActions } from "./actions.ts";

const service = "censys";

export const provider: ProviderDefinition = {
  service,
  displayName: "Censys",
  categories: ["Security", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Personal Access Token",
      placeholder: "CENSYS_PERSONAL_ACCESS_TOKEN",
      description:
        "Censys Personal Access Token sent with the Authorization Bearer header. Create or view tokens in the Censys Platform account settings: https://platform.censys.io.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://censys.com",
  actions: censysActions,
};
