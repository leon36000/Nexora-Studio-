import type { ProviderDefinition } from "../../core/types.ts";

import { autotaskActions } from "./actions.ts";

const service = "autotask";

export const provider: ProviderDefinition = {
  service,
  displayName: "Autotask",
  categories: ["Productivity", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Username",
      placeholder: "apiuser@example.com",
      description:
        "Autotask API-only user name sent with the Username header. Create an API user and tracking identifier in Autotask security settings as described in the official REST authentication docs: https://www.autotask.net/help/developerhelp/Content/APIs/REST/General_Topics/REST_Security_Auth.htm",
      extraFields: [
        {
          key: "secret",
          label: "Secret",
          inputType: "password",
          required: true,
          secret: true,
          placeholder: "AUTOTASK_SECRET",
          description:
            "Autotask API-only user secret sent with the Secret header. Find it with the API user credentials in Autotask security settings: https://www.autotask.net/help/developerhelp/Content/APIs/REST/General_Topics/REST_Security_Auth.htm",
        },
        {
          key: "integrationCode",
          label: "Integration Code",
          inputType: "password",
          required: true,
          secret: true,
          placeholder: "AUTOTASK_INTEGRATION_CODE",
          description:
            "Autotask tracking identifier sent with the APIIntegrationcode header. Generate or assign it on the API-only user's Security tab: https://www.autotask.net/help/developerhelp/Content/APIs/REST/General_Topics/REST_Security_Auth.htm",
        },
      ],
    },
  ],
  homepageUrl: "https://www.datto.com/products/autotask-psa/",
  actions: autotaskActions,
};
