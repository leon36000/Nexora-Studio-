import type { ProviderDefinition } from "../../core/types.ts";

import { streamtimeActions } from "./actions.ts";

const service = "streamtime";

export const provider: ProviderDefinition = {
  service,
  displayName: "Streamtime",
  categories: ["Productivity", "Finance"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Bearer Token",
      placeholder: "streamtime_bearer_token",
      description:
        "Streamtime bearer token used with the Authorization header. Request it from the Streamtime App in Company Settings by following the official public API guide: https://help.streamtime.net/en/articles/12854233-using-the-streamtime-public-api.",
    },
  ],
  homepageUrl: "https://www.streamtime.net",
  actions: streamtimeActions,
};
