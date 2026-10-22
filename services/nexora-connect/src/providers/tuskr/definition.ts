import type { ProviderDefinition } from "../../core/types.ts";

import { tuskrActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "tuskr",
  displayName: "Tuskr",
  description: "Manage projects, test cases, test runs, and results in Tuskr.",
  categories: ["Developer Tools", "Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Permanent Access Token",
      placeholder: "tuskr_access_token",
      description:
        "Tuskr permanent access token sent with the Authorization: Bearer <token> header. Create it from Top Menu > profile icon > API in Tuskr: https://tuskr.app/kb/latest/api",
      extraFields: [
        {
          key: "tenantId",
          label: "Tenant ID",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "5f465f45-37d2-4209-8764-3b0f8aee1754",
          description:
            "Tuskr tenant ID used in every API path. Find it from Top Menu > profile icon > API in Tuskr: https://tuskr.app/kb/latest/api",
        },
      ],
    },
  ],
  homepageUrl: "https://tuskr.app",
  actions: tuskrActions,
};
