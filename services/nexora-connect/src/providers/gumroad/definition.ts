import type { ProviderDefinition } from "../../core/types.ts";

import { gumroadActions } from "./actions.ts";

const service = "gumroad";

export const provider: ProviderDefinition = {
  service,
  displayName: "Gumroad",
  categories: ["Finance", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Access Token",
      placeholder: "GUMROAD_ACCESS_TOKEN",
      description:
        "Gumroad access token passed as the access_token parameter. Generate it from the official Gumroad API page while signed in: https://gumroad.com/api.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://gumroad.com",
  actions: gumroadActions,
};
