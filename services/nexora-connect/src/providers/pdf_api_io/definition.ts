import type { ProviderDefinition } from "../../core/types.ts";

import { pdfApiIoActions } from "./actions.ts";

const service = "pdf_api_io";

export const provider: ProviderDefinition = {
  service,
  displayName: "PDF-API.io",
  categories: ["Productivity", "Design & Media"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "pdf_api_io_token",
      description:
        "PDF-API.io API token used with the Authorization Bearer header. Create it from the official API Tokens page: https://pdf-api.io/app/api-tokens.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://pdf-api.io",
  actions: pdfApiIoActions,
};
