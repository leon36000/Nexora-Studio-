import type { ProviderDefinition } from "../../core/types.ts";

import { postgridVerifyActions } from "./actions.ts";

const service = "postgrid_verify";

export const provider: ProviderDefinition = {
  service,
  displayName: "PostGrid Verify",
  categories: ["Location", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "POSTGRID_API_KEY",
      description:
        "PostGrid Verify API key sent with the x-api-key request header. Create or copy it from your PostGrid dashboard: https://dashboard.postgrid.com/",
      extraFields: [],
    },
  ],
  homepageUrl: "https://www.postgrid.com/address-verification/",
  actions: postgridVerifyActions,
};
