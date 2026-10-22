import type { ProviderDefinition } from "../../core/types.ts";

import { rosetteTextAnalyticsActions } from "./actions.ts";

const service = "rosette_text_analytics";

export const provider: ProviderDefinition = {
  service,
  displayName: "Rosette Text Analytics",
  categories: ["AI"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Babel Street API Key",
      placeholder: "BABELSTREET_API_KEY",
      description:
        "Babel Street Analytics API key sent in the X-BabelStreetAPI-Key header. Sign up for an Analytics API key in the Babel Street Developer Portal: https://developer.babelstreet.com/signup.",
    },
  ],
  homepageUrl: "https://www.babelstreet.com/babel-street-insights",
  actions: rosetteTextAnalyticsActions,
};
