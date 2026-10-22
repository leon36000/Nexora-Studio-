import type { ProviderDefinition } from "../../core/types.ts";

import { contentstackContentManagementActions } from "./actions.ts";

const service = "contentstack_content_management";

export const provider: ProviderDefinition = {
  service,
  displayName: "Contentstack Content Management",
  categories: ["Data", "Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Management Token",
      placeholder: "CONTENTSTACK_MANAGEMENT_TOKEN",
      description:
        "Contentstack Management Token sent with the authorization header. Create or view it under Settings > Tokens > Management Tokens: https://www.contentstack.com/docs/developers/create-tokens/create-a-management-token",
      extraFields: [
        {
          key: "stackApiKey",
          label: "Stack API Key",
          inputType: "password",
          required: true,
          secret: true,
          placeholder: "CONTENTSTACK_STACK_API_KEY",
          description:
            "Contentstack stack API key sent with the api_key header. Find it with the Management Token in your stack under Settings > Tokens > Management Tokens: https://www.contentstack.com/docs/developers/create-tokens/create-a-management-token",
        },
        {
          key: "branch",
          label: "Branch UID",
          inputType: "text",
          required: false,
          secret: false,
          placeholder: "main",
          description: "Optional Contentstack branch UID sent with the branch header when your stack uses branches.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.contentstack.com/",
  actions: contentstackContentManagementActions,
};
