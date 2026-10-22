import type { ProviderDefinition } from "../../core/types.ts";

import { getnoteActions } from "./actions.ts";

const service = "getnote";

/**
 * Getnote provider backed by the Getnote open platform API.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "Getnote",
  categories: ["AI", "Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "gk_live_xxxxx",
      description:
        "Getnote API key sent with the Authorization header. Create an app in the official open platform: https://www.biji.com/openapi.",
      extraFields: [
        {
          key: "clientId",
          label: "Client ID",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "cli_xxxxx",
          description:
            "Getnote Client ID sent with the X-Client-ID header. It is shown with the API key after you create an app in the official open platform: https://www.biji.com/openapi.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.biji.com/",
  actions: getnoteActions,
};
