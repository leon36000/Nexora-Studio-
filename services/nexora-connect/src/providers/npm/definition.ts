import type { ProviderDefinition } from "../../core/types.ts";

import { npmActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "npm",
  displayName: "npm",
  categories: ["Developer Tools"],
  authTypes: ["no_auth", "api_key"],
  auth: [
    { type: "no_auth" },
    {
      type: "api_key",
      label: "Granular Access Token",
      placeholder: "npm_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      description:
        "Optional for public actions and required for get_current_user or private package access. Create a granular access token by following npm's official guide: https://docs.npmjs.com/creating-and-viewing-access-tokens/.",
    },
  ],
  homepageUrl: "https://www.npmjs.com/",
  actions: npmActions,
};
