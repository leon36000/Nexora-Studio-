import type { ProviderDefinition } from "../../core/types.ts";

import { predisAiActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "predis_ai",
  displayName: "Predis.ai",
  description: "List Predis.ai templates and posts, and submit AI content generation requests.",
  categories: ["AI", "Marketing", "Design & Media"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "YOUR_PREDIS_AI_API_KEY",
      description:
        "Predis.ai API key sent with the Authorization header. Generate it in the Predis.ai app under Pricing & Account > Rest API: https://app.predis.ai.",
    },
  ],
  homepageUrl: "https://predis.ai",
  actions: predisAiActions,
};
