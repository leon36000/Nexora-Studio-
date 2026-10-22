import type { ProviderDefinition } from "../../core/types.ts";

import { zipcodebaseActions } from "./actions.ts";

const service = "zipcodebase";

export const provider: ProviderDefinition = {
  service,
  displayName: "Zipcodebase",
  categories: ["Location", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "ZIPCODEBASE_API_KEY",
      description:
        "Zipcodebase API key sent with the apikey header. Get one from the Zipcodebase developer portal: https://app.zipcodebase.com/register.",
    },
  ],
  homepageUrl: "https://zipcodebase.com/",
  actions: zipcodebaseActions,
};
