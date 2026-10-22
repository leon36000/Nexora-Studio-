import type { ProviderDefinition } from "../../core/types.ts";

import { statuscakeActions } from "./actions.ts";

const service = "statuscake";

export const provider: ProviderDefinition = {
  service,
  displayName: "StatusCake",
  categories: ["Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "statuscake_api_token",
      description:
        "StatusCake API token used with the Authorization Bearer header. View or manage it from the StatusCake account panel.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://www.statuscake.com",
  actions: statuscakeActions,
};
