import type { ProviderDefinition } from "../../core/types.ts";

import { shotstackActions } from "./actions.ts";

const service = "shotstack";

export const provider: ProviderDefinition = {
  service,
  displayName: "Shotstack",
  categories: ["Developer Tools", "Design & Media"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "YOUR_SHOTSTACK_API_KEY",
      description:
        "Shotstack API key sent in the x-api-key header. Create or copy an API key from the Shotstack dashboard at https://dashboard.shotstack.io/.",
    },
  ],
  homepageUrl: "https://shotstack.io",
  actions: shotstackActions,
};
