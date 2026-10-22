import type { ProviderDefinition } from "../../core/types.ts";

import { appcircleActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "appcircle",
  displayName: "Appcircle",
  categories: ["Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key Secret",
      placeholder: "APPCIRCLE_API_KEY_SECRET",
      description:
        "Appcircle organization API key secret. Create one under My Organization > Security > API Keys: https://docs.appcircle.io/account/my-organization/security/api-keys.",
      extraFields: [
        {
          key: "apiKeyName",
          label: "API Key Name",
          required: true,
          secret: false,
          inputType: "text",
          placeholder: "my-api-key",
          description: "The name assigned to the Appcircle organization API key.",
        },
        {
          key: "organizationId",
          label: "Organization ID",
          required: false,
          secret: false,
          inputType: "text",
          placeholder: "123e4567-e89b-12d3-a456-426614174000",
          description: "Optional Appcircle organization ID used to scope the access token.",
        },
      ],
    },
  ],
  homepageUrl: "https://appcircle.io/",
  actions: appcircleActions,
};
