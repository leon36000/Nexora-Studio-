import type { ProviderDefinition } from "../../core/types.ts";

import { zigpollActions } from "./actions.ts";

const service = "zigpoll";

export const provider: ProviderDefinition = {
  service,
  displayName: "Zigpoll",
  categories: ["Marketing", "Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "zigpoll_private_key",
      description:
        "Zigpoll private API key sent in the Authorization header. Create or copy it from the Zigpoll dashboard under Integrations > Private Keys: https://docs.zigpoll.com/web-api.",
    },
  ],
  homepageUrl: "https://www.zigpoll.com",
  actions: zigpollActions,
};
