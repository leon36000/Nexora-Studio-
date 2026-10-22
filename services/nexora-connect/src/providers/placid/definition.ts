import type { ProviderDefinition } from "../../core/types.ts";

import { placidActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "placid",
  displayName: "Placid",
  categories: ["Design & Media", "Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "placid_xxx",
      description:
        "Placid project API token used with the Authorization Bearer header. Sign in, open your project, then copy the token from API Tokens: https://placid.app/app/projects",
    },
  ],
  homepageUrl: "https://placid.app",
  actions: placidActions,
};
