import type { ProviderDefinition } from "../../core/types.ts";

import { sonarCloudActions } from "./actions.ts";
import { sonarCloudDefaultApiBaseUrl } from "./constants.ts";

export const provider: ProviderDefinition = {
  service: "sonarcloud",
  displayName: "SonarQube Cloud",
  description: "Inspect projects, code issues, and quality measures with SonarQube Cloud.",
  categories: ["Developer Tools", "Security"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Token",
      placeholder: "SONAR_TOKEN",
      description:
        "SonarQube Cloud personal access token or scoped organization token sent as a Bearer token. Create a token from My Account > Security: https://sonarcloud.io/account/security",
      extraFields: [
        {
          key: "apiBaseUrl",
          label: "API Base URL",
          inputType: "text",
          required: false,
          secret: false,
          placeholder: sonarCloudDefaultApiBaseUrl,
          description:
            "Optional official SonarQube Cloud region API base URL. Use https://sonarcloud.io/api for EU or https://sonarqube.us/api for US: https://docs.sonarsource.com/sonarqube-cloud/advanced-setup/web-api",
        },
      ],
    },
  ],
  homepageUrl: "https://www.sonarsource.com/products/sonarqube/cloud/",
  actions: sonarCloudActions,
};
