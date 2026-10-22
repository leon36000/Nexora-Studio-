import type { ProviderDefinition } from "../../core/types.ts";

import { pdfCoActions } from "./actions.ts";

const service = "pdf_co";

export const provider: ProviderDefinition = {
  service,
  displayName: "PDF.co",
  categories: ["Productivity", "Design & Media"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "PDF_CO_API_KEY",
      description:
        "PDF.co API key sent with the x-api-key header. Sign in to the PDF.co dashboard to copy or create API keys: https://app.pdf.co/.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://pdf.co",
  actions: pdfCoActions,
};
