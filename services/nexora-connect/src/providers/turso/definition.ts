import type { ProviderDefinition } from "../../core/types.ts";

import { tursoActions } from "./actions.ts";

const service = "turso";

export const provider: ProviderDefinition = {
  service,
  displayName: "Turso",
  categories: ["Developer Tools", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Platform API Token",
      placeholder: "eyJ...",
      description:
        "Turso Platform API token used with the Authorization Bearer header. Create one with `turso auth api-tokens mint <name>` as documented here: https://docs.turso.tech/cli/auth/api-tokens/mint.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://turso.tech",
  actions: tursoActions,
};
