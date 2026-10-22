import type { ProviderDefinition } from "../../core/types.ts";

import { emailableActions } from "./actions.ts";

const service = "emailable";

export const provider: ProviderDefinition = {
  service,
  displayName: "Emailable",
  categories: ["Communication", "Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "EMAILABLE_API_KEY",
      description:
        "Emailable API key sent with the Authorization Bearer header. Create or roll it from your Emailable dashboard API settings: https://emailable.com/docs/api.",
    },
  ],
  homepageUrl: "https://emailable.com",
  actions: emailableActions,
};
