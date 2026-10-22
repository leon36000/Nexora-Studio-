import type { ProviderDefinition } from "../../core/types.ts";

import { knackActions } from "./actions.ts";

const service = "knack";

/**
 * Knack provider backed by the server-side REST API.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "Knack",
  categories: ["Productivity", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "knack_api_key",
      description:
        "Knack server-side REST API key used with the X-Knack-REST-API-Key header. View it under Settings -> API & Code -> API in the Knack Builder: https://docs.knack.com/v3/reference/api-key-app-id.",
      extraFields: [
        {
          key: "appId",
          label: "Application ID",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "app_xxxxxxxx",
          description:
            "The Knack Application ID sent with the X-Knack-Application-Id header. Copy it from Settings -> API & Code -> API in the Knack Builder: https://docs.knack.com/v3/reference/api-key-app-id.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.knack.com",
  actions: knackActions,
};
