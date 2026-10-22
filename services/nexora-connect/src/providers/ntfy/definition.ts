import type { ProviderDefinition } from "../../core/types.ts";

import { ntfyActions } from "./actions.ts";

const service = "ntfy";

export const provider: ProviderDefinition = {
  service,
  displayName: "ntfy",
  categories: ["Communication", "Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Access Token",
      placeholder: "NTFY_ACCESS_TOKEN",
      description:
        "ntfy access token sent with the Authorization Bearer header. Create tokens with the ntfy token command or in the ntfy web app Account section: https://docs.ntfy.sh/publish/#access-tokens.",
    },
  ],
  homepageUrl: "https://ntfy.sh",
  actions: ntfyActions,
};
