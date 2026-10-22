import type { ProviderDefinition } from "../../core/types.ts";

import { databricksActions } from "./actions.ts";

const service = "databricks";

export const provider: ProviderDefinition = {
  service,
  displayName: "Databricks",
  categories: ["Data", "Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Personal Access Token",
      placeholder: "dapi...",
      description: "Databricks personal access token used with the Authorization Bearer header.",
      extraFields: [
        {
          key: "host",
          label: "Workspace Host",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "https://dbc-xxxx.cloud.databricks.com",
          description: "The HTTPS Databricks workspace host used to validate the token and execute actions.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.databricks.com",
  actions: databricksActions,
};
