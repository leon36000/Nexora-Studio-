import type { ProviderDefinition } from "../../core/types.ts";

import { appstleSubscriptionsActions } from "./actions.ts";

const service = "appstle_subscriptions";

export const provider: ProviderDefinition = {
  service,
  displayName: "Appstle Subscriptions",
  categories: ["Productivity", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "apst_...",
      description:
        "Appstle API key sent with the X-API-Key header. Create it in your Appstle admin panel under Settings > API Key Management: https://developers.appstle.com/subscription/authentication",
    },
  ],
  homepageUrl: "https://appstle.com",
  actions: appstleSubscriptionsActions,
};
