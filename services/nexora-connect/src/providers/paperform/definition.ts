import type { ProviderDefinition } from "../../core/types.ts";

import { paperformActions } from "./actions.ts";

const service = "paperform";

export const provider: ProviderDefinition = {
  service,
  displayName: "Paperform",
  categories: ["Productivity", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "PAPERFORM_API_KEY",
      description:
        "Paperform API key used with the Authorization: Bearer <api_key> header. Generate or copy it from the Paperform developer account page: https://paperform.co/account/developer.",
    },
  ],
  homepageUrl: "https://paperform.co",
  actions: paperformActions,
};
