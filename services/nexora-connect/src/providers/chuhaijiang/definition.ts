import type { ProviderDefinition } from "../../core/types.ts";

import { chuhaijiangActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "chuhaijiang",
  displayName: "出海匠",
  categories: ["Data", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "sk_live_xxxxxxxxxxxxxxxx",
      description:
        "Chuhaijiang API key used to access its Open API. Sign in and create or view a key at https://www.chuhaijiang.com/open-platform.",
    },
  ],
  homepageUrl: "https://www.chuhaijiang.com/",
  actions: chuhaijiangActions,
};
