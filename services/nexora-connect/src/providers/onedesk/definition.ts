import type { ProviderDefinition } from "../../core/types.ts";

import { onedeskActions } from "./actions.ts";

const service = "onedesk";

export const provider: ProviderDefinition = {
  service,
  displayName: "OneDesk",
  categories: ["Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Public API Key",
      placeholder: "OD_PUBLIC_API_KEY",
      description:
        "OneDesk public API key sent with the OD-Public-API-Key header. See OneDesk's public API documentation: https://onedesk.com/dev/",
    },
  ],
  homepageUrl: "https://www.onedesk.com",
  actions: onedeskActions,
};
