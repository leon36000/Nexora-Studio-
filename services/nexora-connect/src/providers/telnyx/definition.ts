import type { ProviderDefinition } from "../../core/types.ts";

import { telnyxActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "telnyx",
  displayName: "Telnyx",
  categories: ["Communication", "Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "TELNYX_API_KEY",
      description:
        "Telnyx V2 API key sent as a Bearer token. Create, rotate, or revoke keys in the Telnyx portal: https://portal.telnyx.com/#/app/api-keys",
    },
  ],
  homepageUrl: "https://telnyx.com/",
  actions: telnyxActions,
};
