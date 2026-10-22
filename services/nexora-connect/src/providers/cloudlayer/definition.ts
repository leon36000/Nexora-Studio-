import type { ProviderDefinition } from "../../core/types.ts";

import { cloudlayerActions } from "./actions.ts";

const service = "cloudlayer";

export const provider: ProviderDefinition = {
  service,
  displayName: "cloudlayer.io",
  categories: ["Productivity", "Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "cl_live_...",
      description:
        "cloudlayer.io API key sent with the X-API-Key header. Find and manage your keys in the official cloudlayer.io dashboard: https://beta-app.cloudlayer.io",
      extraFields: [],
    },
  ],
  homepageUrl: "https://cloudlayer.io",
  actions: cloudlayerActions,
};
