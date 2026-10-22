import type { ProviderDefinition } from "../../core/types.ts";

import { trentActions } from "./actions.ts";

const service = "trent";

export const provider: ProviderDefinition = {
  service,
  displayName: "Trent",
  categories: ["AI", "Security"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "TRENT_API_KEY",
      description:
        "Trent API key sent with the Authorization header. Get OpenClaw access and create your key from Trent's OpenClaw setup flow: https://trent.ai/openclaw/",
      extraFields: [],
    },
  ],
  homepageUrl: "https://trent.ai/",
  actions: trentActions,
};
