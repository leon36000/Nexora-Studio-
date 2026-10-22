import type { ProviderDefinition } from "../../core/types.ts";

import { unioneActions } from "./actions.ts";

const service = "unione";

export const provider: ProviderDefinition = {
  service,
  displayName: "UniOne",
  categories: ["Communication", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "UniOne API key",
      description:
        "UniOne user or project API key used with the X-API-KEY header. Create or view keys in account settings or project settings: https://cp.unione.io/en/user/info/api.",
    },
  ],
  homepageUrl: "https://unione.io",
  actions: unioneActions,
};
