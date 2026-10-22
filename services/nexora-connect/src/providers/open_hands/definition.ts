import type { ProviderDefinition } from "../../core/types.ts";

import { openHandsActions } from "./actions.ts";

const service = "open_hands";

export const provider: ProviderDefinition = {
  service,
  displayName: "OpenHands",
  categories: ["AI", "Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "openhands_api_key",
      description:
        "OpenHands Cloud API key sent with the Authorization Bearer header. Create it from Settings > API Keys in OpenHands Cloud: https://app.all-hands.dev/settings/api-keys.",
    },
  ],
  homepageUrl: "https://www.all-hands.dev",
  actions: openHandsActions,
};
