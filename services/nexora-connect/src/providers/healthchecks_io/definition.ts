import type { ProviderDefinition } from "../../core/types.ts";

import { healthchecksIoActions } from "./actions.ts";

const service = "healthchecks_io";

export const provider: ProviderDefinition = {
  service,
  displayName: "Healthchecks.io",
  categories: ["Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "healthchecks_api_key",
      description:
        "Healthchecks.io Management API key sent with the X-Api-Key header. Create or view it from Project Settings > API Access in your Healthchecks.io dashboard: https://healthchecks.io/docs/api/.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://healthchecks.io",
  actions: healthchecksIoActions,
};
