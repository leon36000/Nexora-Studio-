import type { ProviderDefinition } from "../../core/types.ts";

import { discourseActions } from "./actions.ts";

const service = "discourse";

export const provider: ProviderDefinition = {
  service,
  displayName: "Discourse",
  categories: ["Communication", "Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "DISCOURSE_API_KEY",
      description: "Discourse API key sent with the Api-Key header. Create an API key from your forum admin panel.",
      extraFields: [
        {
          key: "baseUrl",
          label: "Forum URL",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "https://meta.discourse.org",
          description: "The HTTPS base URL of your Discourse forum.",
        },
        {
          key: "apiUsername",
          label: "API Username",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "system",
          description: "The Discourse API username sent with the Api-Username header.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.discourse.org/",
  actions: discourseActions,
};
