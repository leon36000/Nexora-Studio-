import type { ProviderDefinition } from "../../core/types.ts";

import { newRelicActions } from "./actions.ts";

const service = "new_relic";

/**
 * New Relic provider backed by NerdGraph and supported REST APIs.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "New Relic",
  categories: ["Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "User Key",
      placeholder: "Your New Relic user key",
      description:
        "New Relic user key sent with the Api-Key header for NerdGraph and supported REST API requests. Manage user keys from the official API keys page: https://docs.newrelic.com/docs/apis/intro-apis/new-relic-api-keys/.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://newrelic.com",
  actions: newRelicActions,
};
