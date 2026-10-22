import type { ProviderDefinition } from "../../core/types.ts";

import { browserbaseActions } from "./actions.ts";

const service = "browserbase";

export const provider: ProviderDefinition = {
  service,
  displayName: "Browserbase",
  categories: ["Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "bb_live_xxx",
      description:
        "Browserbase API key used with the X-BB-API-Key header. Find it in Browserbase Dashboard Settings: https://docs.browserbase.com/introduction/getting-started.",
      extraFields: [
        {
          key: "projectId",
          label: "Project ID",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "proj_xxx",
          description:
            "Browserbase project ID used as the default project scope for this connection. Copy it from Browserbase Dashboard Settings.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.browserbase.com",
  actions: browserbaseActions,
};
