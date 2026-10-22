import type { ProviderDefinition } from "../../core/types.ts";

import { aivoovActions } from "./actions.ts";

const service = "aivoov";

export const provider: ProviderDefinition = {
  service,
  displayName: "AiVOOV",
  categories: ["AI", "Design & Media"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "aivoov_api_key",
      description:
        "AiVOOV API key sent with the x-api-key header. Get it from your AiVOOV account while setting up the Text-to-Speech API: https://aivoov.com/text-to-speech-api.",
    },
  ],
  homepageUrl: "https://aivoov.com",
  actions: aivoovActions,
};
