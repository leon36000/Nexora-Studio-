import type { ProviderDefinition } from "../../core/types.ts";

import { countdownApiActions } from "./actions.ts";

const service = "countdown_api";

export const provider: ProviderDefinition = {
  service,
  displayName: "Countdown API",
  categories: ["Data", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Countdown API Key",
      placeholder: "COUNTDOWN_API_KEY",
      description:
        "Countdown API key sent as the api key query parameter. Get one from the Countdown API sign-up page: https://app.countdownapi.com/signup",
    },
  ],
  homepageUrl: "https://countdownapi.com/",
  actions: countdownApiActions,
};
