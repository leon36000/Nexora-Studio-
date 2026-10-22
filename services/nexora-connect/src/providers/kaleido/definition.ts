import type { ProviderDefinition } from "../../core/types.ts";

import { kaleidoActions } from "./actions.ts";
import { kaleidoDefaultBaseUrl } from "./constants.ts";

const service = "kaleido";

/**
 * Kaleido provider backed by the public Kaleido platform API.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "Kaleido",
  categories: ["Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "KALEIDO_API_KEY",
      description:
        "Kaleido API key sent as a Bearer token in the Authorization header. Create or view organization API keys in the Kaleido console API Keys area documented at https://api.kaleido.io/platform.html#tag/API-Keys.",
      extraFields: [
        {
          key: "baseUrl",
          label: "API Base URL",
          inputType: "text",
          required: false,
          secret: false,
          placeholder: kaleidoDefaultBaseUrl,
          description:
            "Optional Kaleido regional API base URL. Use the endpoint matching your resource region from Kaleido's Regional API Endpoints docs: https://docs.kaleido.io/developers/automation/regions/.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.kaleido.io",
  actions: kaleidoActions,
};
