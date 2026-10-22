import type { ProviderDefinition } from "../../core/types.ts";

import { pdfmonkeyActions } from "./actions.ts";

const service = "pdfmonkey";

export const provider: ProviderDefinition = {
  service,
  displayName: "PDFMonkey",
  categories: ["Productivity", "Design & Media"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "pdfmonkey_secret_key",
      description:
        "PDFMonkey secret API key used with the Authorization Bearer header. Find it on the API Key page in the PDFMonkey dashboard: https://pdfmonkey.io/docs/api/authentication/.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://pdfmonkey.io",
  actions: pdfmonkeyActions,
};
