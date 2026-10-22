import type { ProviderDefinition } from "../../core/types.ts";

import { imagekitActions } from "./actions.ts";

const service = "imagekit";

/**
 * ImageKit provider backed by the ImageKit Digital Asset Management API.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "ImageKit",
  categories: ["Design & Media", "Storage"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Private API Key",
      placeholder: "private_...",
      description:
        "ImageKit private API key used as the HTTP Basic auth username. View or reveal it in the ImageKit dashboard under Developer options > API keys.",
    },
  ],
  homepageUrl: "https://imagekit.io",
  actions: imagekitActions,
};
