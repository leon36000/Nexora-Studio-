import type { ProviderDefinition } from "../../core/types.ts";

import { projectmanagerActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "projectmanager",
  displayName: "ProjectManager",
  categories: ["Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "PROJECTMANAGER_API_KEY",
      description:
        "ProjectManager API key used with the Authorization Bearer header. Admins can create keys from Integrations > API Keys in the ProjectManager app.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://www.projectmanager.com",
  actions: projectmanagerActions,
};
