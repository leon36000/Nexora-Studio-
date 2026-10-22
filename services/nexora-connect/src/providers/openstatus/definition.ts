import type { ProviderDefinition } from "../../core/types.ts";

import { openstatusActions } from "./actions.ts";

const service = "openstatus";

export const provider: ProviderDefinition = {
  service,
  displayName: "OpenStatus",
  categories: ["Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "os_...",
      description:
        "OpenStatus API key sent with the x-openstatus-key header. Create it from the OpenStatus dashboard: https://www.openstatus.dev/app.",
    },
  ],
  homepageUrl: "https://www.openstatus.dev",
  actions: openstatusActions,
};
