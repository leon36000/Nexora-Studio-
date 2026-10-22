import type { ProviderDefinition } from "../../core/types.ts";

import { companycamActions } from "./actions.ts";

const service = "companycam";

/**
 * CompanyCam provider backed by the public CompanyCam API.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "CompanyCam",
  categories: ["Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Access Token",
      placeholder: "COMPANYCAM_ACCESS_TOKEN",
      description:
        "CompanyCam access token used with the Authorization: Bearer header. Generate or view access tokens in the CompanyCam app: https://app.companycam.com/access_tokens.",
    },
  ],
  homepageUrl: "https://companycam.com",
  actions: companycamActions,
};
