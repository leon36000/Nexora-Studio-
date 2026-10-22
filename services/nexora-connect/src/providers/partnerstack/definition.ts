import type { ProviderDefinition } from "../../core/types.ts";

import { partnerstackActions } from "./actions.ts";

const service = "partnerstack";

export const provider: ProviderDefinition = {
  service,
  displayName: "PartnerStack",
  categories: ["Marketing", "Finance"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Secret Key",
      placeholder: "PARTNERSTACK_SECRET_KEY",
      description:
        "PartnerStack secret key used as the Basic Auth password. Find public and secret keys in the Vendor dashboard under Settings > Integrations > PartnerStack API Keys: https://docs.partnerstack.com/reference/auth",
      extraFields: [
        {
          key: "publicKey",
          label: "Public Key",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "PARTNERSTACK_PUBLIC_KEY",
          description:
            "PartnerStack public key used as the Basic Auth username. Find it with the paired secret key in Settings > Integrations > PartnerStack API Keys: https://docs.partnerstack.com/reference/auth",
        },
      ],
    },
  ],
  homepageUrl: "https://partnerstack.com",
  actions: partnerstackActions,
};
