import type { ProviderDefinition } from "../../core/types.ts";

import { lapostaActions } from "./actions.ts";

const service = "laposta";

export const provider: ProviderDefinition = {
  service,
  displayName: "Laposta",
  categories: ["Marketing", "Communication"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "LAPOSTA_API_KEY",
      description:
        "Laposta API key used as the HTTP Basic Auth username with an empty password. Create a key from the Koppelingen page in your Laposta account: https://docs.laposta.nl/article/349-hoe-kom-ik-aan-een-api-sleutel.",
    },
  ],
  homepageUrl: "https://laposta.nl/",
  actions: lapostaActions,
};
