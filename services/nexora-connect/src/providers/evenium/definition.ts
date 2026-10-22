import type { ProviderDefinition } from "../../core/types.ts";

import { eveniumActions } from "./actions.ts";

const service = "evenium";

export const provider: ProviderDefinition = {
  service,
  displayName: "Evenium",
  categories: ["Productivity", "Communication"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "evenium_api_key",
      description:
        "Evenium API key or access token sent with the X-Evenium-Token header. Retrieve it from your Evenium profile API key settings.",
    },
  ],
  homepageUrl: "https://corp.evenium.com",
  actions: eveniumActions,
};
