import type { ProviderDefinition } from "../../core/types.ts";

import { browseAiActions } from "./actions.ts";

const service = "browse_ai";

export const provider: ProviderDefinition = {
  service,
  displayName: "Browse AI",
  categories: ["Data", "Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "YOUR_SECRET_API_KEY",
      description:
        "Browse AI secret API key passed in the Authorization Bearer header. Create it in the API tab of your Browse AI dashboard: https://help.browse.ai/en/articles/12683249-api-guide-getting-started.",
    },
  ],
  homepageUrl: "https://www.browse.ai",
  actions: browseAiActions,
};
