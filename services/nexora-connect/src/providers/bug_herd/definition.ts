import type { ProviderDefinition } from "../../core/types.ts";

import { bugHerdActions } from "./actions.ts";

const service = "bug_herd";

export const provider: ProviderDefinition = {
  service,
  displayName: "BugHerd",
  categories: ["Developer Tools", "Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "your_bugherd_api_key",
      description:
        "BugHerd API key used as the Basic Auth username with x as the password. Find it under Settings > General in your BugHerd account: https://www.bugherd.com/settings/general.",
    },
  ],
  homepageUrl: "https://bugherd.com/",
  actions: bugHerdActions,
};
