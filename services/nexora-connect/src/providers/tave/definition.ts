import type { ProviderDefinition } from "../../core/types.ts";

import { taveActions } from "./actions.ts";

const service = "tave";

export const provider: ProviderDefinition = {
  service,
  displayName: "Táve",
  categories: ["Productivity", "Communication"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "TAVE_API_KEY",
      description:
        "VSCO Workspace API key used with the X-API-KEY header. Create or view it in Workspace API settings.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://www.vsco.co/workspace",
  actions: taveActions,
};
