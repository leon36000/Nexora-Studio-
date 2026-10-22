import type { ProviderDefinition } from "../../core/types.ts";

import { documensoActions } from "./actions.ts";

const service = "documenso";

export const provider: ProviderDefinition = {
  service,
  displayName: "Documenso",
  categories: ["Productivity", "Communication"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "api_xxxxxxxxxxxxxxxx",
      description:
        "Documenso API token sent with the Authorization header. Create or manage tokens from Settings > API Tokens: https://docs.documenso.com/docs/users/settings/api-tokens.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://documenso.com",
  actions: documensoActions,
};
