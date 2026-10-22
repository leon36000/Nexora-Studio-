import type { ProviderDefinition } from "../../core/types.ts";

import { honeybadgerActions } from "./actions.ts";

const service = "honeybadger";

/**
 * Honeybadger provider backed by the Honeybadger Reporting API.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "Honeybadger",
  categories: ["Developer Tools", "Security"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Project API Key",
      placeholder: "hb_project_xxx",
      description:
        "Honeybadger project API key used by the Reporting API. Find or rotate it in your project API keys settings.",
      extraFields: [
        {
          key: "apiBaseUrl",
          label: "API Base URL",
          inputType: "text",
          required: false,
          secret: false,
          placeholder: "https://api.honeybadger.io",
          description:
            "Optional Honeybadger API endpoint override. Use https://eu-api.honeybadger.io for EU region accounts.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.honeybadger.io",
  actions: honeybadgerActions,
};
