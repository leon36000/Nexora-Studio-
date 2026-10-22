import type { ProviderDefinition } from "../../core/types.ts";

import { captainBiActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "captainbi",
  displayName: "CaptainBI",
  categories: ["Data", "Marketing"],
  authTypes: ["custom_credential"],
  auth: [
    {
      type: "custom_credential",
      fields: [
        {
          key: "clientId",
          label: "APPID",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "CAPTAINBI_APPID",
          description:
            "The APPID for a CaptainBI API authorization. Create one under Authorization > Captain API: https://www.captainbi.com/amz_faq_list-216.html.",
        },
        {
          key: "clientSecret",
          label: "Client Secret",
          inputType: "password",
          required: true,
          secret: true,
          placeholder: "CAPTAINBI_CLIENT_SECRET",
          description: "The secret paired with the CaptainBI APPID.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.captainbi.com/",
  actions: captainBiActions,
};
