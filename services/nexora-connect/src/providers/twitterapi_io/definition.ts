import type { ProviderDefinition } from "../../core/types.ts";

import { twitterapiIoActions } from "./actions.ts";

const service = "twitterapi_io";

export const provider: ProviderDefinition = {
  service,
  displayName: "TwitterAPI.io",
  categories: ["Social", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "TWITTERAPI_IO_API_KEY",
      description:
        "TwitterAPI.io API key used with the X-API-Key request header. Create or copy it from your TwitterAPI.io dashboard: https://twitterapi.io/dashboard.",
    },
  ],
  homepageUrl: "https://twitterapi.io",
  actions: twitterapiIoActions,
};
