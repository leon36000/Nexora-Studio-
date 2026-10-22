import type { ProviderDefinition } from "../../core/types.ts";

import { snykActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "snyk",
  displayName: "Snyk",
  categories: ["Security", "Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "SNYK_API_TOKEN",
      description:
        "Snyk API token sent with the Authorization: token <apiKey> header. Create a personal access token from Snyk account settings: https://app.snyk.io/account/personal-access-tokens.",
    },
  ],
  homepageUrl: "https://snyk.io",
  actions: snykActions,
};
