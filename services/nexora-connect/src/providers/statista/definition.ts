import type { ProviderDefinition } from "../../core/types.ts";

import { statistaActions } from "./actions.ts";

const service = "statista";

export const provider: ProviderDefinition = {
  service,
  displayName: "Statista",
  categories: ["Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "STATISTA_API_KEY",
      description:
        "Statista API key sent with the x-api-key header. Request or obtain access through the Statista API key page: https://docs.platform.statista.ai/start/request-api-key.",
    },
  ],
  homepageUrl: "https://www.statista.com",
  actions: statistaActions,
};
