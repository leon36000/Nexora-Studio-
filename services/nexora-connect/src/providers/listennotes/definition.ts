import type { ProviderDefinition } from "../../core/types.ts";

import { listennotesActions } from "./actions.ts";

const service = "listennotes";

export const provider: ProviderDefinition = {
  service,
  displayName: "Listen Notes",
  categories: ["Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "LISTENNOTES_API_KEY",
      description:
        "Listen Notes API key used with the X-ListenAPI-Key header. Create it in your Listen API dashboard: https://www.listennotes.com/api/dashboard/.",
    },
  ],
  homepageUrl: "https://www.listennotes.com",
  actions: listennotesActions,
};
