import type { ProviderDefinition } from "../../core/types.ts";

import { freepikActions } from "./actions.ts";

const service = "freepik";

export const provider: ProviderDefinition = {
  service,
  displayName: "Magnific (Freepik)",
  categories: ["Design & Media", "AI"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "MAGNIFIC_API_KEY",
      description:
        "Freepik/Magnific API key sent with the x-magnific-api-key header. Sign in as an administrator and create a key from the API Keys dashboard: https://www.magnific.com/user/api-keys.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://www.magnific.com/freepik",
  actions: freepikActions,
};
