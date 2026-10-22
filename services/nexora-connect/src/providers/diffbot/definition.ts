import type { ProviderDefinition } from "../../core/types.ts";

import { diffbotActions } from "./actions.ts";

const service = "diffbot";

export const provider: ProviderDefinition = {
  service,
  displayName: "Diffbot",
  categories: ["Data", "AI"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "DIFFBOT_TOKEN",
      description:
        "Diffbot API token sent with the token query parameter. Copy it from the account menu in the Diffbot app.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://www.diffbot.com",
  actions: diffbotActions,
};
