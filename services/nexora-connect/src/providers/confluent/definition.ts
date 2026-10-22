import type { ProviderDefinition } from "../../core/types.ts";

import { confluentActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "confluent",
  displayName: "Confluent",
  description: "Manage Confluent Cloud organizations, environments, and Kafka clusters.",
  categories: ["Developer Tools", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Cloud API Secret",
      placeholder: "CONFLUENT_CLOUD_API_SECRET",
      description:
        "Confluent Cloud API secret used as the Basic Auth password. Create a Cloud API key and secret in Confluent Cloud: https://docs.confluent.io/cloud/current/security/authenticate/workload-identities/service-accounts/api-keys/manage-api-keys.html",
      extraFields: [
        {
          key: "apiKeyId",
          label: "Cloud API Key ID",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "CONFLUENT_CLOUD_API_KEY",
          description: "Confluent Cloud API key ID used as the Basic Auth username.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.confluent.io",
  actions: confluentActions,
};
