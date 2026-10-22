import type { ProviderDefinition } from "../../core/types.ts";

import { parsehubActions } from "./actions.ts";

const service = "parsehub";

export const provider: ProviderDefinition = {
  service,
  displayName: "ParseHub",
  categories: ["Data", "Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "PARSEHUB_API_KEY",
      description:
        "ParseHub API key sent as the api_key query parameter. Find it in your ParseHub account API settings: https://www.parsehub.com/docs/ref/api/v2/.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://www.parsehub.com",
  actions: parsehubActions,
};
