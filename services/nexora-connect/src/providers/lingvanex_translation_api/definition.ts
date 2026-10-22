import type { ProviderDefinition } from "../../core/types.ts";

import { lingvanexTranslationApiActions } from "./actions.ts";

const service = "lingvanex_translation_api";

export const provider: ProviderDefinition = {
  service,
  displayName: "Lingvanex Translation API",
  categories: ["AI", "Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "LINGVANEX_API_KEY",
      description:
        "Lingvanex Translation API key passed as the key query parameter. Create or view your key in the Lingvanex dashboard: https://account.lingvanex.com/dashboard/.",
    },
  ],
  homepageUrl: "https://lingvanex.com/products/translationapi/",
  actions: lingvanexTranslationApiActions,
};
