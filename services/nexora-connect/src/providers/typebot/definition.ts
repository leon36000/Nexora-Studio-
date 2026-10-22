import type { ProviderDefinition } from "../../core/types.ts";

import { typebotActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "typebot",
  displayName: "Typebot",
  categories: ["Communication", "Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "Typebot API token",
      description:
        "Typebot API token sent as a Bearer credential. Create one under Settings & Members > My account > API tokens: https://app.typebot.io/typebots.",
    },
  ],
  homepageUrl: "https://typebot.com",
  actions: typebotActions,
};
