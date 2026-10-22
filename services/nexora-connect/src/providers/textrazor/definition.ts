import type { ProviderDefinition } from "../../core/types.ts";

import { textrazorActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "textrazor",
  displayName: "TextRazor",
  categories: ["AI", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "TEXTRAZOR_API_KEY",
      description:
        "TextRazor API key used with the X-TextRazor-Key request header. Sign up for an API key at https://www.textrazor.com/signup.",
    },
  ],
  homepageUrl: "https://www.textrazor.com",
  actions: textrazorActions,
};
