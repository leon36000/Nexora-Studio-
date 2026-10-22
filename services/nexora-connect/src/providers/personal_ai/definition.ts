import type { ProviderDefinition } from "../../core/types.ts";

import { personalAiActions } from "./actions.ts";

const service = "personal_ai";

export const provider: ProviderDefinition = {
  service,
  displayName: "Personal AI",
  categories: ["AI", "Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "PERSONAL_AI_API_KEY",
      description:
        "Personal AI API key sent with the x-api-key header. Create or copy it from your Personal AI API settings: https://docs.personal.ai/api-reference/endpoint/ai-message",
      extraFields: [
        {
          key: "domainName",
          label: "Domain Name",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "product-demo-jebzrhw",
          description: "The hyphenated domain name shown below the AI persona name in Personal AI.",
        },
      ],
    },
  ],
  homepageUrl: "https://personal.ai",
  actions: personalAiActions,
};
