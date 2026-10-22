import type { ProviderDefinition } from "../../core/types.ts";

import { launchDarklyActions } from "./actions.ts";

const service = "launch_darkly";

/**
 * LaunchDarkly provider backed by the v2 REST API.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "LaunchDarkly",
  categories: ["Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Access Token",
      placeholder: "api-xxxxxxxxxxxxxxxx",
      description:
        "LaunchDarkly personal or service access token sent with the Authorization request header. Create it from LaunchDarkly account authorization settings.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://launchdarkly.com",
  actions: launchDarklyActions,
};
