import type { ProviderDefinition } from "../../core/types.ts";

import { elasticsearchActions } from "./actions.ts";

const service = "elasticsearch";

export const provider: ProviderDefinition = {
  service,
  displayName: "Elasticsearch",
  categories: ["Data", "Developer Tools"],
  authTypes: ["api_key", "custom_credential"],
  auth: [
    {
      type: "api_key",
      label: "Encoded API Key",
      placeholder: "base64-encoded-id-and-api-key",
      description: "Elasticsearch encoded API key sent with the Authorization: ApiKey header.",
      extraFields: [
        {
          key: "baseUrl",
          label: "Elasticsearch URL",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "https://es.example.com:9200",
          description: "Elasticsearch API base URL for your own deployment, including any proxy path if required.",
        },
      ],
    },
    {
      type: "custom_credential",
      fields: [
        {
          key: "baseUrl",
          label: "Elasticsearch URL",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "https://es.example.com:9200",
          description: "Elasticsearch API base URL for your own deployment, including any proxy path if required.",
        },
        {
          key: "username",
          label: "Username",
          inputType: "text",
          required: true,
          secret: false,
          description: "The Basic auth username for your own Elasticsearch deployment.",
        },
        {
          key: "password",
          label: "Password",
          inputType: "password",
          required: true,
          secret: true,
          description: "The Basic auth password for your own Elasticsearch deployment.",
        },
      ],
      testAction: {
        actionName: "ping_cluster",
        input: {},
      },
    },
  ],
  homepageUrl: "https://www.elastic.co/elasticsearch",
  actions: elasticsearchActions,
};
