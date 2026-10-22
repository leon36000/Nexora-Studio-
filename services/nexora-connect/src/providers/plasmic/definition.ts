import type { ProviderDefinition } from "../../core/types.ts";

import { plasmicActions } from "./actions.ts";

const service = "plasmic";

export const provider: ProviderDefinition = {
  service,
  displayName: "Plasmic",
  categories: ["Design & Media", "Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "CMS Token",
      placeholder: "PLASMIC_CMS_PUBLIC_OR_SECRET_TOKEN",
      description:
        "Plasmic CMS token sent with the x-plasmic-api-cms-tokens header. Find the CMS ID, public token, and secret token on the CMS Settings tab: https://docs.plasmic.app/learn/plasmic-cms-api-reference/#find-your-cms-ids-public-token-and-secret-token.",
      extraFields: [
        {
          key: "cmsId",
          label: "CMS ID",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "PLASMIC_CMS_ID",
          description:
            "The Plasmic CMS ID used as the first part of the x-plasmic-api-cms-tokens header. Copy it from the CMS Settings tab: https://docs.plasmic.app/learn/plasmic-cms-api-reference/#find-your-cms-ids-public-token-and-secret-token.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.plasmic.app",
  actions: plasmicActions,
};
