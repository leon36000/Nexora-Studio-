import type { ProviderDefinition } from "../../core/types.ts";

import { polarActions } from "./actions.ts";

const service = "polar";

/**
 * Polar provider backed by the public Polar API.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "Polar",
  categories: ["Finance", "Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Organization Access Token",
      placeholder: "POLAR_OAT",
      description:
        "Polar Organization Access Token sent as a Bearer token. Create OATs in your Polar organization settings: https://polar.sh/docs/api-reference/introduction#authentication.",
    },
  ],
  homepageUrl: "https://polar.sh",
  actions: polarActions,
};
