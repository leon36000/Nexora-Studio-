import type { ProviderDefinition } from "../../core/types.ts";

import { wolframAlphaApiActions } from "./actions.ts";

const service = "wolfram_alpha_api";

export const provider: ProviderDefinition = {
  service,
  displayName: "Wolfram|Alpha",
  categories: ["AI", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "AppID",
      placeholder: "Your Wolfram|Alpha AppID",
      description:
        "Wolfram|Alpha AppID sent with the appid query parameter. Create it from your My Apps page in the Wolfram|Alpha developer portal: https://developer.wolframalpha.com/portal/myapps",
      extraFields: [],
    },
  ],
  homepageUrl: "https://products.wolframalpha.com/api/",
  actions: wolframAlphaApiActions,
};
