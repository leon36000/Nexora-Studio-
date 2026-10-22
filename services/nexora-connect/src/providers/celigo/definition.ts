import type { ProviderDefinition } from "../../core/types.ts";

import { celigoActions } from "./actions.ts";

const service = "celigo";

export const provider: ProviderDefinition = {
  service,
  displayName: "Celigo",
  categories: ["Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "CELIGO_API_TOKEN",
      description:
        "Celigo API token used with the Authorization Bearer header. Create or manage it in integrator.io API Tokens: https://docs.celigo.com/hc/en-us/articles/360019782431-API-tokens.",
      extraFields: [
        {
          key: "apiBaseUrl",
          label: "API Base URL",
          inputType: "text",
          required: false,
          secret: false,
          placeholder: "https://api.integrator.io",
          description:
            "Optional regional integrator.io API base URL. Use https://api.integrator.io or https://api.eu.integrator.io.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.celigo.com",
  actions: celigoActions,
};
