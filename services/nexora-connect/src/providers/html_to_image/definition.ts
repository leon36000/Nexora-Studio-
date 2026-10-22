import type { ProviderDefinition } from "../../core/types.ts";

import { htmlToImageActions } from "./actions.ts";

const service = "html_to_image";

/**
 * HTML to Image provider backed by the html2img.com API.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "HTML to Image",
  categories: ["Developer Tools", "Design & Media"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "your_api_key",
      description: "HTML to Image API key sent in the X-API-Key header.",
    },
  ],
  homepageUrl: "https://html2img.com",
  actions: htmlToImageActions,
};
