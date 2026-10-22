import type { ProviderDefinition } from "../../core/types.ts";

import { smartsheetActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "smartsheet",
  displayName: "Smartsheet",
  categories: ["Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Access Token",
      placeholder: "SMARTSHEET_ACCESS_TOKEN",
      description:
        "Smartsheet access token used as a Bearer token. Generate it in Smartsheet from Account > Apps & Integrations > API Access: https://developers.smartsheet.com/api/smartsheet/guides/basics/authentication.",
    },
  ],
  homepageUrl: "https://www.smartsheet.com",
  actions: smartsheetActions,
};
