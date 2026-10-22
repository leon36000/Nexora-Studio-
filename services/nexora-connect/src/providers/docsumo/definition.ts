import type { ProviderDefinition } from "../../core/types.ts";

import { docsumoActions } from "./actions.ts";

const service = "docsumo";

export const provider: ProviderDefinition = {
  service,
  displayName: "Docsumo",
  categories: ["AI", "Productivity", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "DOCSUMO_API_KEY",
      description: "Docsumo API key sent with the apikey header. Copy it from Docsumo API settings.",
    },
  ],
  homepageUrl: "https://www.docsumo.com",
  actions: docsumoActions,
};
