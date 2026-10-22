import type { ProviderDefinition } from "../../core/types.ts";

import { mopinionActions } from "./actions.ts";

const service = "mopinion";

export const provider: ProviderDefinition = {
  service,
  displayName: "Mopinion",
  categories: ["Data", "Marketing"],
  authTypes: ["custom_credential"],
  auth: [
    {
      type: "custom_credential",
      fields: [
        {
          key: "publicKey",
          label: "Public Key",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "public_key",
          description:
            "Mopinion public key used as the application identifier in signed API requests. Create or view API credentials in Mopinion Suite under Settings > Feedback Api or Integrations > Feedback API: https://developer.mopinion.com/api/.",
        },
        {
          key: "signatureToken",
          label: "Signature Token",
          inputType: "password",
          required: true,
          secret: true,
          placeholder: "signature_token",
          description:
            "Mopinion signature token used to create the HMAC value for x-auth-token. Create or view API credentials in Mopinion Suite under Settings > Feedback Api or Integrations > Feedback API: https://developer.mopinion.com/api/.",
        },
      ],
      testAction: {
        actionName: "get_account",
        input: {},
      },
    },
  ],
  homepageUrl: "https://www.mopinion.com",
  actions: mopinionActions,
};
