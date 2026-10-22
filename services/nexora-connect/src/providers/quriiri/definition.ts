import type { ProviderDefinition } from "../../core/types.ts";

import { quriiriActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "quriiri",
  displayName: "Quriiri",
  categories: ["Communication", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "QURIIRI_API_KEY",
      description:
        "Quriiri API key used with the Authorization Bearer header. Create or manage API keys in Quriiri under Management > API keys: https://docs.quriiri.fi/docs/quriiri/send-sms.",
      extraFields: [
        {
          key: "apiBaseUrl",
          label: "API Base URL",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "https://example.com",
          description: "The HTTP common API URL copied from Quriiri under Message Router > Resources.",
        },
      ],
    },
  ],
  homepageUrl: "https://quriiri.fi/",
  actions: quriiriActions,
};
