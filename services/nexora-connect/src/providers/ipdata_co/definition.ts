import type { ProviderDefinition } from "../../core/types.ts";

import { ipdataCoActions } from "./actions.ts";

const service = "ipdata_co";

/**
 * ipdata.co provider backed by the public IP intelligence API.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "ipdata.co",
  categories: ["Location", "Security", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "ipd_live_xxx",
      description:
        "ipdata API key passed as the api-key query parameter. Sign up for a free key or view authentication examples in the docs: https://docs.ipdata.co/reference/authentication.",
    },
  ],
  homepageUrl: "https://ipdata.co",
  actions: ipdataCoActions,
};
