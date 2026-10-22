import type { ProviderDefinition } from "../../core/types.ts";

import { formsiteActions } from "./actions.ts";

const service = "formsite";

/**
 * Formsite provider backed by the public Formsite API.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "Formsite",
  categories: ["Productivity", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Access Token",
      placeholder: "formsite_access_token",
      description:
        "Formsite access token used with the Authorization bearer header. Copy it from Settings > Integrations > Formsite API in your Formsite account: https://support.formsite.com/hc/en-us/articles/46181026038931-API.",
      extraFields: [
        {
          key: "apiBaseUrl",
          label: "API Base URL",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "https://fs8.formsite.com/api/v2",
          description:
            "The exact API base URL shown on your Formsite API page, ending with /api/v2. Formsite provides this in Settings > Integrations > Formsite API.",
        },
        {
          key: "userDir",
          label: "Default User Directory",
          inputType: "text",
          required: false,
          secret: false,
          placeholder: "user123",
          description:
            "Optional default user directory shown on your Formsite API page or in form URLs between the host and /forms/. Leave it empty only if you want to pass user_dir explicitly in actions.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.formsite.com",
  actions: formsiteActions,
};
