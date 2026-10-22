import type { ProviderDefinition } from "../../core/types.ts";

import { keenIoActions } from "./actions.ts";

const service = "keen_io";

export const provider: ProviderDefinition = {
  service,
  displayName: "Keen IO",
  categories: ["Data", "Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Master API Key",
      placeholder: "KEEN_MASTER_API_KEY",
      description:
        "Keen Master API Key sent with the Authorization header. Find it in your Keen project settings: https://keen.io/projects/.",
      extraFields: [
        {
          key: "projectId",
          label: "Project ID",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "PROJECT_ID",
          description:
            "Keen project ID used in each API path. Find it in the same Keen project settings page: https://keen.io/projects/.",
        },
      ],
    },
  ],
  homepageUrl: "https://keen.io/",
  actions: keenIoActions,
};
