import type { ProviderDefinition } from "../../core/types.ts";

import { elasticemailActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "elasticemail",
  displayName: "Elastic Email",
  categories: ["Communication", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "Elastic Email API key",
      description:
        "Elastic Email API key used with the X-ElasticEmail-ApiKey request header. Manage access tokens in the Elastic Email API settings: https://app.elasticemail.com/marketing/settings/new/manage-api.",
    },
  ],
  homepageUrl: "https://elasticemail.com",
  actions: elasticemailActions,
};
