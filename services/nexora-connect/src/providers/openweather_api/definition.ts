import type { ProviderDefinition } from "../../core/types.ts";

import { openweatherApiActions } from "./actions.ts";

const service = "openweather_api";

export const provider: ProviderDefinition = {
  service,
  displayName: "OpenWeather",
  categories: ["Location", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "OPENWEATHER_API_KEY",
      description:
        "OpenWeather API key sent as the appid query parameter. Find or create it on the API keys page in your OpenWeather account: https://openweathermap.org/faq.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://openweathermap.org",
  actions: openweatherApiActions,
};
