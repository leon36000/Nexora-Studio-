import type { ProviderDefinition } from "../../core/types.ts";

import { metatextaiActions } from "./actions.ts";

const service = "metatextai";

export const provider: ProviderDefinition = {
  service,
  displayName: "MetatextAI",
  categories: ["AI", "Security"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Auth Token",
      placeholder: "metatext_auth_token",
      description:
        "MetatextAI auth token used with the Authorization: Bearer <token> header for guard-api requests. Create or copy it from the MetatextAI console API/auth token settings documented in the official API reference: https://docs.metatext.ai/introduction.",
      extraFields: [
        {
          key: "applicationId",
          label: "Application ID",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "my-app",
          description:
            "MetatextAI application identifier used in application-scoped guardrails endpoints. Use an existing application ID from your MetatextAI console before connecting this provider.",
        },
      ],
    },
  ],
  homepageUrl: "https://metatext.ai",
  actions: metatextaiActions,
};
