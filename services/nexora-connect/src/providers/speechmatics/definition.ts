import type { ProviderDefinition } from "../../core/types.ts";

import { speechmaticsActions } from "./actions.ts";

const service = "speechmatics";

export const provider: ProviderDefinition = {
  service,
  displayName: "Speechmatics",
  description:
    "Submit URL-based Batch transcriptions, poll job status, retrieve transcripts, and inspect Speechmatics capabilities and deployments.",
  categories: ["AI", "Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "SPEECHMATICS_API_KEY",
      description:
        "Project-scoped Speechmatics API key used for Speech to Text requests. Create one in the active project: https://portal.speechmatics.com/settings/api-keys.",
      extraFields: [
        {
          key: "defaultRegion",
          label: "Default Batch Region",
          inputType: "text",
          required: false,
          secret: false,
          placeholder: "eu1",
          description:
            "Default Speechmatics Batch SaaS region. Supported values are eu1, eu2, us1, us2, and au1; actions may override it.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.speechmatics.com/",
  actions: speechmaticsActions,
};
