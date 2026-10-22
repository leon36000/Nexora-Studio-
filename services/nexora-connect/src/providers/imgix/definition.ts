import type { ProviderDefinition } from "../../core/types.ts";

import { imgixActions } from "./actions.ts";

const service = "imgix";

/**
 * Imgix provider backed by the public Imgix Management API.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "Imgix",
  categories: ["Design & Media", "Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "IMGIX_API_KEY",
      description:
        "Imgix Management API key sent as a Bearer token. Create or copy an API key from the Imgix dashboard API keys page: https://dashboard.imgix.com/api-keys.",
    },
  ],
  homepageUrl: "https://www.imgix.com",
  actions: imgixActions,
};
