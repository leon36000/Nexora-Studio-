import type { ProviderDefinition } from "../../core/types.ts";

import { emailListVerifyActions } from "./actions.ts";

const service = "emaillistverify";

export const provider: ProviderDefinition = {
  service,
  displayName: "EmailListVerify",
  categories: ["Communication", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "EMAILLISTVERIFY_API_KEY",
      description:
        "EmailListVerify API key passed as the secret query parameter. Get or activate your API key from the API page: https://emaillistverify.com/api.",
    },
  ],
  homepageUrl: "https://emaillistverify.com",
  actions: emailListVerifyActions,
};
