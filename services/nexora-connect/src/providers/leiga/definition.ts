import type { ProviderDefinition } from "../../core/types.ts";

import { leigaActions } from "./actions.ts";

const service = "leiga";

/**
 * Leiga provider backed by the public Leiga OpenAPI.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "Leiga",
  categories: ["Productivity", "Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Personal API Key",
      placeholder: "LEIGA_ACCESS_TOKEN",
      description:
        "Leiga personal API key sent with the accessToken header. Create or manage it under My Settings > Personal API Keys: https://guide.leiga.com/personal/key",
      extraFields: [],
    },
  ],
  homepageUrl: "https://www.leiga.com/",
  actions: leigaActions,
};
