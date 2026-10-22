import type { ProviderDefinition } from "../../core/types.ts";

import { kontentAiActions } from "./actions.ts";

const service = "kontent_ai";

/**
 * Kontent.ai Management API provider.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "Kontent.ai",
  categories: ["Productivity", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Management API Key",
      placeholder: "KONTENT_AI_MANAGEMENT_API_KEY",
      description:
        "Kontent.ai Management API key sent as an Authorization: Bearer token. Create or copy keys from the official Management API key docs: https://kontent.ai/learn/docs/apis/management-api-v2/api-keys.",
      extraFields: [
        {
          key: "environmentId",
          label: "Environment ID",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "975bf280-fd91-488c-994c-2f04416e5ee3",
          description:
            "Kontent.ai environment ID used in Management API /projects/{environment_id} paths. The official Postman collection names this value project_id: https://kontent.ai/learn/docs/apis/management-api-v2/postman-collection.",
        },
      ],
    },
  ],
  homepageUrl: "https://kontent.ai",
  actions: kontentAiActions,
};
