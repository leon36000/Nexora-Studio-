import type { ProviderDefinition } from "../../core/types.ts";

import { updownIoActions } from "./actions.ts";

const service = "updown_io";

export const provider: ProviderDefinition = {
  service,
  displayName: "updown.io",
  categories: ["Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "updown_api_key",
      description:
        "updown.io API key used with the X-API-KEY header. Sign in to view your API key at https://updown.io/api.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://updown.io",
  actions: updownIoActions,
};
