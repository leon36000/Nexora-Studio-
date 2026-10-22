import type { ProviderDefinition } from "../../core/types.ts";

import { botsonicActions } from "./actions.ts";

const service = "botsonic";

export const provider: ProviderDefinition = {
  service,
  displayName: "Botsonic",
  categories: ["AI", "Communication"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Bot API Token",
      placeholder: "botsonic_bot_api_token",
      description:
        "Botsonic bot API token sent with the X-BOT-KEY header. Open your Botsonic dashboard, select a bot, then copy the token from Integration Page > REST API as described at https://docs.botsonic.com/docs/rest-api.",
    },
  ],
  homepageUrl: "https://botsonic.com",
  actions: botsonicActions,
};
