import type { ProviderDefinition } from "../../core/types.ts";

import { aerisweatherActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "aerisweather",
  displayName: "Xweather",
  categories: ["Location", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Client Secret",
      placeholder: "XWEATHER_CLIENT_SECRET",
      description:
        "Xweather API client secret passed as the client_secret query parameter. Register an application in the Xweather Apps section to get the access ID and secret key: https://www.xweather.com/docs/weather-api/getting-started",
      extraFields: [
        {
          key: "clientId",
          label: "Client ID",
          inputType: "password",
          required: true,
          secret: true,
          placeholder: "XWEATHER_CLIENT_ID",
          description:
            "Xweather API access ID passed as the client_id query parameter. Register an application in the Xweather Apps section to get the access ID and secret key: https://www.xweather.com/docs/weather-api/getting-started",
        },
      ],
    },
  ],
  homepageUrl: "https://www.xweather.com/",
  actions: aerisweatherActions,
};
