import type { ProviderDefinition } from "../../core/types.ts";

import { cloudinaryActions } from "./actions.ts";

const service = "cloudinary";

export const provider: ProviderDefinition = {
  service,
  displayName: "Cloudinary",
  categories: ["Design & Media", "Storage"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "cloudinary_api_key",
      description:
        "Cloudinary API key used with HTTP Basic authentication for Upload API and Admin API requests. Find it in Cloudinary Console Settings > API Keys: https://console.cloudinary.com/app/settings/api-keys .",
      extraFields: [
        {
          key: "cloudName",
          label: "Cloud Name",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "my-cloud",
          description:
            "Cloudinary cloud name used in every API path. Find it on the same API Keys page or in the Cloudinary onboarding guide: https://cloudinary.com/documentation/dev_kickstart_acct_setup .",
        },
        {
          key: "apiSecret",
          label: "API Secret",
          inputType: "password",
          required: true,
          secret: true,
          placeholder: "cloudinary_api_secret",
          description:
            "Cloudinary API secret paired with the API key for HTTP Basic authentication. Find it on Cloudinary Console Settings > API Keys: https://console.cloudinary.com/app/settings/api-keys .",
        },
      ],
    },
  ],
  homepageUrl: "https://cloudinary.com",
  actions: cloudinaryActions,
};
