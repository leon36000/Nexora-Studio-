import type { ProviderDefinition } from "../../core/types.ts";

import { honeyhiveActions } from "./actions.ts";

const service = "honeyhive";

export const provider: ProviderDefinition = {
  service,
  displayName: "HoneyHive",
  description: "Manage HoneyHive evaluation datasets and their datapoints.",
  categories: ["AI", "Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "HONEYHIVE_API_KEY",
      description:
        "Project-scoped HoneyHive API key sent as a Bearer token. Create one under Settings > Project > API Keys: https://app.us.honeyhive.ai/settings/project/keys",
    },
  ],
  homepageUrl: "https://www.honeyhive.ai/",
  actions: honeyhiveActions,
};
