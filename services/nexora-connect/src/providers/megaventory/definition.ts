import type { ProviderDefinition } from "../../core/types.ts";

import { megaventoryActions } from "./actions.ts";
export const provider: ProviderDefinition = {
  service: "megaventory",
  displayName: "Megaventory",
  categories: ["Productivity", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "YOUR_API_KEY",
      description: "Megaventory API key sent in JSON request bodies. Generate one from Profile > My Profile.",
    },
  ],
  homepageUrl: "https://www.megaventory.com/",
  actions: megaventoryActions,
};
