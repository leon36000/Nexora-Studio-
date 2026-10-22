import type { ProviderDefinition } from "../../core/types.ts";

import { customerioActions } from "./actions.ts";

const service = "customerio";

export const provider: ProviderDefinition = {
  service,
  displayName: "Customer.io",
  categories: ["Marketing", "Communication", "Data"],
  authTypes: ["custom_credential"],
  auth: [
    {
      type: "custom_credential",
      fields: [
        {
          key: "siteId",
          label: "Site ID",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "CUSTOMERIO_SITE_ID",
          description:
            "Customer.io Track API Site ID used as the Basic Auth username. Find it on the Track API Keys page: https://fly.customer.io/settings/api_credentials.",
        },
        {
          key: "apiKey",
          label: "Track API Key",
          inputType: "password",
          required: true,
          secret: true,
          placeholder: "CUSTOMERIO_TRACK_API_KEY",
          description:
            "Customer.io Track API key used as the Basic Auth password. Create or view it on the Track API Keys page: https://fly.customer.io/settings/api_credentials.",
        },
      ],
    },
  ],
  homepageUrl: "https://customer.io/",
  actions: customerioActions,
};
