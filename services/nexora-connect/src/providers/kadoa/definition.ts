import type { ProviderDefinition } from "../../core/types.ts";

import { kadoaActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "kadoa",
  displayName: "Kadoa",
  categories: ["Data", "Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Workspace API Key",
      placeholder: "tk-your-api-key",
      description:
        "Kadoa workspace API key sent with the x-api-key header. Generate it from Settings > General: https://docs.kadoa.com/api-reference/introduction.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://www.kadoa.com",
  actions: kadoaActions,
};
