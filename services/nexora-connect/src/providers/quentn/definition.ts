import type { ProviderDefinition } from "../../core/types.ts";

import { quentnActions } from "./actions.ts";

const service = "quentn";

export const provider: ProviderDefinition = {
  service,
  displayName: "Quentn",
  categories: ["Marketing", "Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "QUENTN_API_KEY",
      description:
        "Quentn API key sent with the Authorization: Bearer header. Create or copy an API key from Settings > API Info in your Quentn system: https://help.quentn.com/hc/en-150/articles/4517564565649-Requests",
      extraFields: [
        {
          key: "systemId",
          label: "System ID",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "my-system",
          description:
            "Quentn system ID from your API endpoint hostname, for example the first label in https://my-system.server.quentn.com/public/api/V1.",
        },
        {
          key: "serverId",
          label: "Server ID",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "server",
          description:
            "Quentn server ID from your API endpoint hostname, for example the second label in https://my-system.server.quentn.com/public/api/V1.",
        },
      ],
    },
  ],
  homepageUrl: "https://quentn.com",
  actions: quentnActions,
};
