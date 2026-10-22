import type { ProviderDefinition } from "../../core/types.ts";

import { plausibleAnalyticsActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "plausible_analytics",
  displayName: "Plausible Analytics",
  categories: ["Data", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Stats API Key",
      placeholder: "plausible_stats_api_key",
      description:
        "Plausible Stats API key used with the Authorization Bearer header. Create it in Settings > API Keys and choose Stats API: https://plausible.io/docs/stats-api.",
      extraFields: [
        {
          key: "siteId",
          label: "Site ID",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "example.com",
          description: "Default Plausible site identifier to validate and use when actions omit site_id or domain.",
        },
        {
          key: "baseUrl",
          label: "Base URL",
          inputType: "text",
          required: false,
          secret: false,
          placeholder: "https://plausible.io",
          description: "Optional Plausible instance base URL. Leave empty to use https://plausible.io.",
        },
      ],
    },
  ],
  homepageUrl: "https://plausible.io",
  actions: plausibleAnalyticsActions,
};
