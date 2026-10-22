import type { ProviderDefinition } from "../../core/types.ts";

import { fuxinActions } from "./actions.ts";

const service = "fuxin";

/**
 * Foxit Cloud API provider backed by Foxit's signed Services API endpoints.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "Foxit Cloud API",
  categories: ["Productivity", "Design & Media"],
  authTypes: ["custom_credential"],
  auth: [
    {
      type: "custom_credential",
      fields: [
        {
          key: "clientId",
          label: "Client ID",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "Your Foxit Cloud API client ID",
          description:
            "Foxit Cloud API client ID. Create a project in the Foxit Cloud API developer console, then copy the Client ID from https://cloudapi.fuxinsoft.cn/dev-console/project.",
        },
        {
          key: "secret",
          label: "Secret",
          inputType: "password",
          required: true,
          secret: true,
          placeholder: "Your Foxit Cloud API secret",
          description:
            "Foxit Cloud API client secret from the same developer console project: https://cloudapi.fuxinsoft.cn/dev-console/project.",
        },
      ],
      testAction: {
        actionName: "get_user_stock",
        input: {},
      },
    },
  ],
  homepageUrl: "https://cloudapi.fuxinsoft.cn",
  actions: fuxinActions,
};
