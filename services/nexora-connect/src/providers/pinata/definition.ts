import type { ProviderDefinition } from "../../core/types.ts";

import { pinataActions } from "./actions.ts";

const service = "pinata";

export const provider: ProviderDefinition = {
  service,
  displayName: "Pinata",
  categories: ["Developer Tools", "Storage"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "JWT",
      placeholder: "pinata_jwt",
      description:
        "Pinata JWT used with the Authorization Bearer header. Create or manage API keys from the official API keys page: https://app.pinata.cloud/developers/api-keys.",
    },
  ],
  homepageUrl: "https://pinata.cloud",
  actions: pinataActions,
};
