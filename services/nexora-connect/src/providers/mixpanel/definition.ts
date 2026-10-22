import type { ProviderDefinition } from "../../core/types.ts";

import { mixpanelActions } from "./actions.ts";

const service = "mixpanel";

export const provider: ProviderDefinition = {
  service,
  displayName: "Mixpanel",
  categories: ["Data", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Service Account Secret",
      placeholder: "mixpanel_service_account_secret",
      description:
        "Mixpanel service account secret used with HTTP Basic authentication for project-scoped query APIs. Create it from Mixpanel Service Accounts: https://developer.mixpanel.com/reference/service-accounts-api.",
      extraFields: [
        {
          key: "serviceAccountUsername",
          label: "Service Account Username",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "svc_analytics_bot",
          description:
            "Mixpanel service account username paired with the secret for Basic auth. Find it on the same Mixpanel Service Accounts page.",
        },
        {
          key: "projectId",
          label: "Project ID",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "1234567",
          description:
            "Default Mixpanel project ID used for validation and for actions that omit project_id. Find it in Mixpanel project settings.",
        },
        {
          key: "baseUrl",
          label: "Base URL",
          inputType: "text",
          required: false,
          secret: false,
          placeholder: "https://mixpanel.com",
          description: "Optional Mixpanel query and app API base URL. Leave empty to use https://mixpanel.com.",
        },
        {
          key: "exportBaseUrl",
          label: "Export Base URL",
          inputType: "text",
          required: false,
          secret: false,
          placeholder: "https://data.mixpanel.com",
          description: "Optional Mixpanel raw export API base URL. Leave empty to use https://data.mixpanel.com.",
        },
      ],
    },
  ],
  homepageUrl: "https://mixpanel.com",
  actions: mixpanelActions,
};
