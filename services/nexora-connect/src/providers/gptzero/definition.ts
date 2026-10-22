import type { ProviderDefinition } from "../../core/types.ts";

import { gptzeroActions } from "./actions.ts";

const service = "gptzero";

export const provider: ProviderDefinition = {
  service,
  displayName: "GPTZero",
  description: "Detect AI-generated text with document, paragraph, and sentence-level scores.",
  categories: ["AI"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "YOUR_GPTZERO_API_KEY",
      description:
        "GPTZero API key sent with the x-api-key header. Create an account, subscribe to API access, and copy your key from the GPTZero API page: https://app.gptzero.me/app/api.",
    },
  ],
  homepageUrl: "https://gptzero.me",
  actions: gptzeroActions,
};
