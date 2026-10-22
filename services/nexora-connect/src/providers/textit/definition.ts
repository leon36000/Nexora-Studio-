import type { ProviderDefinition } from "../../core/types.ts";

import { textitActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "textit",
  displayName: "TextIt",
  categories: ["Communication", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "TEXTIT_API_TOKEN",
      description:
        "TextIt API token used with the Authorization: Token <token> header. Sign in and open the official API Explorer linked from https://textit.com/api/v2/ to view or test API requests.",
    },
  ],
  homepageUrl: "https://textit.com",
  actions: textitActions,
};
