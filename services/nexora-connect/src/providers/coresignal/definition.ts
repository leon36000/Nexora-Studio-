import type { ProviderDefinition } from "../../core/types.ts";

import { coresignalActions } from "./actions.ts";

const service = "coresignal";

export const provider: ProviderDefinition = {
  service,
  displayName: "Coresignal",
  categories: ["Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "coresignal_api_key",
      description:
        "Coresignal API key sent with the apikey header. Copy it from the API keys section in the Coresignal self-service dashboard: https://dashboard.coresignal.com/sign-in.",
    },
  ],
  homepageUrl: "https://coresignal.com",
  actions: coresignalActions,
};
