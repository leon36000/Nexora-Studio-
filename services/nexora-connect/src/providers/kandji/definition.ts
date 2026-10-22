import type { ProviderDefinition } from "../../core/types.ts";

import { kandjiActions } from "./actions.ts";

const service = "kandji";

export const provider: ProviderDefinition = {
  service,
  displayName: "Iru (Kandji)",
  categories: ["Productivity", "Security"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "KANDJI_API_TOKEN",
      description:
        "Kandji tenant-level API token sent as a Bearer token. Create it from Settings > Access in the Kandji web app: https://support.kandji.io/api.",
      extraFields: [
        {
          key: "apiUrl",
          label: "API URL",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "https://example.api.kandji.io",
          description:
            "Your tenant-specific Kandji API URL from Settings > Access, such as https://example.api.kandji.io or https://example.api.eu.kandji.io.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.iru.com/",
  actions: kandjiActions,
};
