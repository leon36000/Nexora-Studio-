import type { ProviderDefinition } from "../../core/types.ts";

import { acculynxActions } from "./actions.ts";

const service = "acculynx";

export const provider: ProviderDefinition = {
  service,
  displayName: "AccuLynx",
  categories: ["Productivity", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "AccuLynx API key",
      description:
        "AccuLynx API key used with the Authorization Bearer header. Create or view your key on the official AccuLynx API Keys page: https://my.acculynx.com/apikeys",
    },
  ],
  homepageUrl: "https://acculynx.com",
  actions: acculynxActions,
};
