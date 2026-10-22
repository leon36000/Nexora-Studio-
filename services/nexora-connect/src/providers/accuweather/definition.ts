import type { ProviderDefinition } from "../../core/types.ts";

import { accuweatherActions } from "./actions.ts";

const service = "accuweather";

export const provider: ProviderDefinition = {
  service,
  displayName: "AccuWeather",
  description: "Weather locations, current conditions, and forecasts from AccuWeather.",
  categories: ["Location", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "Your AccuWeather API key",
      description:
        "AccuWeather API key sent as an Authorization Bearer token. Create or copy a key from the AccuWeather developer portal subscriptions page: https://developer.accuweather.com/subscriptions.",
    },
  ],
  homepageUrl: "https://www.accuweather.com",
  actions: accuweatherActions,
};
