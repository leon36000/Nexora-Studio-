import type { ProviderDefinition } from "../../core/types.ts";

import { whopActions } from "./actions.ts";

const service = "whop";

export const provider: ProviderDefinition = {
  service,
  displayName: "Whop",
  categories: ["Finance", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "WHOP_API_KEY",
      description:
        "Whop API key sent with the Authorization: Bearer header. Create an Account API key or reveal an App API key from the Whop dashboard using the official API key guide: https://docs.whop.com/developer/api/quickstart#create-an-api-key.",
    },
  ],
  homepageUrl: "https://whop.com",
  actions: whopActions,
};
