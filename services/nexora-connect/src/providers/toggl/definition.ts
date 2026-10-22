import type { ProviderDefinition } from "../../core/types.ts";

import { togglActions } from "./actions.ts";

const service = "toggl";

export const provider: ProviderDefinition = {
  service,
  displayName: "Toggl Track",
  categories: ["Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "toggl_api_token",
      description: "Toggl Track API token. It is sent with HTTP Basic auth as <token>:api_token.",
    },
  ],
  homepageUrl: "https://toggl.com/track",
  actions: togglActions,
};
