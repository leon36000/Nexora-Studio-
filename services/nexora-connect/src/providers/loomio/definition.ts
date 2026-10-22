import type { ProviderDefinition } from "../../core/types.ts";

import { loomioActions } from "./actions.ts";

const service = "loomio";

export const provider: ProviderDefinition = {
  service,
  displayName: "Loomio",
  categories: ["Productivity", "Communication"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "LOOMIO_API_KEY",
      description:
        "Loomio per-user API key sent as the api_key query parameter. After signing in, open https://www.loomio.com/help/api2 to view your key.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://www.loomio.com",
  actions: loomioActions,
};
