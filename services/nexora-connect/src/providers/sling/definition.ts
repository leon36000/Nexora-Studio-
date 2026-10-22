import type { ProviderDefinition } from "../../core/types.ts";

import { slingActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "sling",
  displayName: "Sling",
  categories: ["Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Authorization Token",
      placeholder: "SLING_AUTHORIZATION_TOKEN",
      description:
        "Sling authorization token sent with the Authorization header. Sling's API docs describe this as the authorization token visible in request headers from a Sling client: https://api.getsling.com/.",
    },
  ],
  homepageUrl: "https://getsling.com",
  actions: slingActions,
};
