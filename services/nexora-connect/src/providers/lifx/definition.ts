import type { ProviderDefinition } from "../../core/types.ts";

import { lifxActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "lifx",
  displayName: "LIFX",
  categories: ["Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Access Token",
      placeholder: "LIFX_ACCESS_TOKEN",
      description:
        "LIFX access token sent with the Authorization Bearer header. Generate or view access tokens in LIFX Cloud settings: https://cloud.lifx.com/settings.",
    },
  ],
  homepageUrl: "https://www.lifx.com",
  actions: lifxActions,
};
