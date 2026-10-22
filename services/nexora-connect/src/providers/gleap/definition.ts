import type { ProviderDefinition } from "../../core/types.ts";

import { gleapActions } from "./actions.ts";

const service = "gleap";

export const provider: ProviderDefinition = {
  service,
  displayName: "Gleap",
  categories: ["Communication", "Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "gleap_api_key",
      description:
        "Gleap API key sent with the Authorization Bearer header. Create or view it in Project Settings > Security > API Key: https://docs.gleap.io/documentation/server/api-overview.",
      extraFields: [
        {
          key: "projectId",
          label: "Project ID",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "gleap_project_id",
          description:
            "Gleap project ID sent with the Project header. It is displayed next to the API key in Project Settings > Security > API Key: https://docs.gleap.io/documentation/server/api-overview.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.gleap.io",
  actions: gleapActions,
};
