import type { ProviderDefinition } from "../../core/types.ts";

import { dumplingaiActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "dumplingai",
  displayName: "DumplingAI",
  categories: ["Data", "Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "YOUR_DUMPLINGAI_API_KEY",
      description:
        "DumplingAI API key sent as a Bearer token. Create or copy a key at https://app.dumplingai.com/settings/api-keys.",
    },
  ],
  homepageUrl: "https://www.dumplingai.com",
  actions: dumplingaiActions,
};
