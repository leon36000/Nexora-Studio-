import type { ProviderDefinition } from "../../core/types.ts";

import { microsoftClarityActions } from "./actions.ts";

const service = "microsoft_clarity";

export const provider: ProviderDefinition = {
  service,
  displayName: "Microsoft Clarity",
  categories: ["Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Access Token",
      placeholder: "clarity_api_token",
      description:
        "Microsoft Clarity API access token sent with the Authorization Bearer header. Project admins can generate it in Settings > Data Export in the Clarity dashboard, as documented at https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-data-export-api.",
    },
  ],
  homepageUrl: "https://clarity.microsoft.com",
  actions: microsoftClarityActions,
};
