import type { ProviderDefinition } from "../../core/types.ts";

import { tinyurlActions } from "./actions.ts";

const service = "tinyurl";

export const provider: ProviderDefinition = {
  service,
  displayName: "TinyURL",
  categories: ["Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "tinyurl_api_token",
      description:
        "TinyURL API token passed with the Authorization: Bearer <token> header. Create it from Profile > API in TinyURL.",
    },
  ],
  homepageUrl: "https://tinyurl.com",
  actions: tinyurlActions,
};
