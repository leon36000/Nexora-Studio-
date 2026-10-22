import type { ProviderDefinition } from "../../core/types.ts";

import { worldNewsApiActions } from "./actions.ts";

const service = "world_news_api";

export const provider: ProviderDefinition = {
  service,
  displayName: "World News API",
  categories: ["Data", "Social"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "WORLD_NEWS_API_KEY",
      description:
        "World News API key sent with the x-api-key request header. Create an account and get your key from the console at https://worldnewsapi.com/console/.",
    },
  ],
  homepageUrl: "https://worldnewsapi.com",
  actions: worldNewsApiActions,
};
