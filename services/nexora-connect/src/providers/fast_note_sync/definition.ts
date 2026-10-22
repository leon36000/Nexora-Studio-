import type { ProviderDefinition } from "../../core/types.ts";

import { fastNoteSyncActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "fast_note_sync",
  displayName: "Fast Note Sync",
  categories: ["Productivity", "Storage"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "FNS_API_TOKEN",
      description: "FNS API token sent as a Bearer credential. Copy it from the API configuration in your FNS WebGUI.",
      extraFields: [
        {
          key: "baseUrl",
          label: "Server Base URL",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "https://fns.example.com",
          description:
            "The HTTP or HTTPS URL of your FNS server. Private targets require OOMOL_CONNECT_ALLOW_PRIVATE_NETWORK.",
        },
      ],
    },
  ],
  homepageUrl: "https://github.com/haierkeys/fast-note-sync-service",
  actions: fastNoteSyncActions,
};
