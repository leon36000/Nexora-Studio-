import type { ProviderDefinition } from "../../core/types.ts";

import { buttondownActions } from "./actions.ts";

const service = "buttondown";

export const provider: ProviderDefinition = {
  service,
  displayName: "Buttondown",
  categories: ["Marketing", "Communication"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "BUTTONDOWN_API_KEY",
      description:
        "Buttondown API key passed as Authorization: Token <api_key>. Find it on the Buttondown API requests page: https://buttondown.com/requests.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://buttondown.com",
  actions: buttondownActions,
};
