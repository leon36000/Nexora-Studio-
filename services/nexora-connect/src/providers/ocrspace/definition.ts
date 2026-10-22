import type { ProviderDefinition } from "../../core/types.ts";

import { ocrspaceActions } from "./actions.ts";

const service = "ocrspace";

export const provider: ProviderDefinition = {
  service,
  displayName: "OCR.space",
  categories: ["AI", "Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "OCRSPACE_API_KEY",
      description:
        "OCR.space API key sent with the apikey header. Get it from the API signup page: https://ocr.space/ocrapi",
      extraFields: [],
    },
  ],
  homepageUrl: "https://ocr.space",
  actions: ocrspaceActions,
};
