import type { ProviderDefinition } from "../../core/types.ts";

import { salesmateActions } from "./actions.ts";

const service = "salesmate";

export const provider: ProviderDefinition = {
  service,
  displayName: "Salesmate",
  categories: ["Marketing", "Communication"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Access Token",
      placeholder: "salesmate_access_token",
      description:
        "Salesmate access token sent with the accessToken header. Create or view it from Salesmate Setup under API Access or API Key settings for your workspace.",
      extraFields: [
        {
          key: "linkName",
          label: "Link Name",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "link_name.salesmate.io",
          description:
            "Your Salesmate workspace link name, such as link_name or link_name.salesmate.io. It is used as the Salesmate API hostname and x-linkname header.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.salesmate.io",
  actions: salesmateActions,
};
