import type { ProviderDefinition } from "../../core/types.ts";

import { logsnagActions } from "./actions.ts";

const service = "logsnag";

export const provider: ProviderDefinition = {
  service,
  displayName: "LogSnag",
  categories: ["Developer Tools", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "LOGSNAG_API_TOKEN",
      description:
        "LogSnag API token sent as Authorization: Bearer <TOKEN>. Create and copy a token from the API page in LogSnag Settings; LogSnag documents the setup at https://docs.logsnag.com/quick-start.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://logsnag.com",
  actions: logsnagActions,
};
