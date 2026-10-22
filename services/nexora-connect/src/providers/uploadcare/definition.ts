import type { ProviderDefinition } from "../../core/types.ts";

import { uploadcareActions } from "./actions.ts";

const service = "uploadcare";

export const provider: ProviderDefinition = {
  service,
  displayName: "Uploadcare",
  categories: ["Storage", "Design & Media"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Secret API Key",
      placeholder: "uploadcare_secret_key",
      description:
        "Uploadcare Secret API Key used to sign REST API requests. Create or view API keys in the Uploadcare dashboard: https://app.uploadcare.com/projects/-/api-keys/.",
      extraFields: [
        {
          key: "publicKey",
          label: "Public API Key",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "uploadcare_public_key",
          description:
            "Uploadcare Public API Key included in the signed REST API Authorization header. Find it with the Secret API Key in the Uploadcare dashboard: https://app.uploadcare.com/projects/-/api-keys/.",
        },
      ],
    },
  ],
  homepageUrl: "https://uploadcare.com",
  actions: uploadcareActions,
};
