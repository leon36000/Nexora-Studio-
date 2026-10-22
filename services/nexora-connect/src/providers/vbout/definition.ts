import type { ProviderDefinition } from "../../core/types.ts";

import { vboutActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "vbout",
  displayName: "VBOUT",
  categories: ["Marketing", "Communication"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "VBOUT_API_KEY",
      description:
        "VBOUT User or Application API Key. View or generate it under Settings > API Integrations: https://help.vbout.com/knowledge-base/api-and-connectors/.",
    },
  ],
  homepageUrl: "https://www.vbout.com",
  actions: vboutActions,
};
