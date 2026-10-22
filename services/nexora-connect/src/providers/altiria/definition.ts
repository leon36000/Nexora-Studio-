import type { ProviderDefinition } from "../../core/types.ts";

import { altiriaActions } from "./actions.ts";

const service = "altiria";

export const provider: ProviderDefinition = {
  service,
  displayName: "Altiria",
  categories: ["Communication", "Marketing"],
  authTypes: ["custom_credential"],
  auth: [
    {
      type: "custom_credential",
      fields: [
        {
          key: "username",
          label: "Username",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "ALTIRIA_USERNAME",
          description:
            "Altiria API username used as the Basic Auth username. Use the username for the Altiria platform account: https://www.altiria.com.",
        },
        {
          key: "apiPassword",
          label: "API Password",
          inputType: "password",
          required: true,
          secret: true,
          placeholder: "ALTIRIA_API_PASSWORD",
          description:
            "Altiria API password used as the Basic Auth password. It is different from the platform login password; get it from the APIs > Change API password menu in the Altiria platform, as described in https://apidocs.altiria.com/.",
        },
        {
          key: "dashboardHost",
          label: "Dashboard Host",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "https://www.altiria.net",
          description:
            "Altiria dashboard host used before /api/rest in API requests. Copy the HTTPS host from your Altiria platform URL; the REST docs show it as DASHBOARD_HOST: https://apidocs.altiria.com/.",
        },
      ],
      testAction: {
        actionName: "list_groups",
        input: {
          limit: 1,
        },
      },
    },
  ],
  homepageUrl: "https://www.altiria.com",
  actions: altiriaActions,
};
