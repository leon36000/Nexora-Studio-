import type { ProviderDefinition } from "../../core/types.ts";

import { oksignActions } from "./actions.ts";

const service = "oksign";

export const provider: ProviderDefinition = {
  service,
  displayName: "OKSign",
  categories: ["Productivity", "Security"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Account Number",
      placeholder: "100693",
      description:
        "The OKSign account number used as the first segment of x-oksign-authorization. Create or manage API access from the OKSign API Console after signing in: https://www.oksign.be/public/api/.",
      extraFields: [
        {
          key: "authorizationToken",
          label: "Authorization Token",
          inputType: "password",
          placeholder: "463204-5BC1F362-85AD-34A3-9DB5-DC891D20979E",
          description:
            "The authorization token defined in your OKSign account and used as the second segment of x-oksign-authorization.",
          required: true,
          secret: true,
        },
        {
          key: "organizationalToken",
          label: "Organizational Token",
          inputType: "password",
          placeholder: "marketing",
          description:
            "The organizational token defined in your OKSign account and used as the third segment of x-oksign-authorization.",
          required: true,
          secret: true,
        },
      ],
    },
  ],
  homepageUrl: "https://www.oksign.be/en/",
  actions: oksignActions,
};
