import type { ProviderDefinition } from "../../core/types.ts";

import { shortIoActions } from "./actions.ts";

const service = "short_io";

export const provider: ProviderDefinition = {
  service,
  displayName: "Short.io",
  categories: ["Marketing", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Secret API Key",
      placeholder: "short_io_secret_key",
      description:
        "Short.io secret API key used with the Authorization header. Create it in Short.io under Integrations & API: https://developers.short.io/docs/creating-an-api-key.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://short.io",
  actions: shortIoActions,
};
