import type { ProviderDefinition } from "../../core/types.ts";

import { chatpdfActions } from "./actions.ts";

const service = "chatpdf";

export const provider: ProviderDefinition = {
  service,
  displayName: "ChatPDF",
  categories: ["AI", "Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "sec_...",
      description:
        "ChatPDF API key sent in the x-api-key header. View your key in the ChatPDF backend API documentation after signing in: https://www.chatpdf.com/docs/api/backend.",
    },
  ],
  homepageUrl: "https://www.chatpdf.com",
  actions: chatpdfActions,
};
