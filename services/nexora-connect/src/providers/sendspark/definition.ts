import type { ProviderDefinition } from "../../core/types.ts";

import { sendsparkActions } from "./actions.ts";

const service = "sendspark";

export const provider: ProviderDefinition = {
  service,
  displayName: "Sendspark",
  categories: ["Marketing", "Design & Media"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Workspace API Key",
      placeholder: "SENDSPARK_WORKSPACE_API_KEY",
      description:
        "Sendspark workspace API key sent with the x-api-key header. Create or view it in the Sendspark API Credentials tab: https://sendspark.com/settings/api-credentials.",
      extraFields: [
        {
          key: "userApiSecret",
          label: "User API Secret",
          inputType: "password",
          placeholder: "SENDSPARK_USER_API_SECRET",
          description:
            "Sendspark user API secret sent with the x-api-secret header. Generate it from the Sendspark API Credentials tab: https://sendspark.com/settings/api-credentials.",
          required: true,
          secret: true,
        },
      ],
    },
  ],
  homepageUrl: "https://sendspark.com/",
  actions: sendsparkActions,
};
