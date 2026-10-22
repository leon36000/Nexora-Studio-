import type { ProviderDefinition } from "../../core/types.ts";

import { linkfoxActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "linkfox",
  displayName: "LinkFox",
  categories: ["Data", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "LinkFox Agent API Key",
      placeholder: "LINKFOX_AGENT_API_KEY",
      description:
        "LinkFox Agent API key sent in the Authorization header. Create or copy it from Personal Center > API Development Guide > LinkFox Agent: https://skill.linkfox.com/linkfoxskills/guide.htm.",
    },
  ],
  homepageUrl: "https://www.linkfox.com/",
  actions: linkfoxActions,
};
