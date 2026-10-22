import type { ProviderDefinition } from "../../core/types.ts";

import { bookingmoodActions } from "./actions.ts";

const service = "bookingmood";

export const provider: ProviderDefinition = {
  service,
  displayName: "Bookingmood",
  categories: ["Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "bookingmood_api_key",
      description:
        "Bookingmood API key used as an Authorization Bearer token. Create or view it from your Bookingmood account API settings: https://www.bookingmood.com/en-US/api-reference.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://www.bookingmood.com",
  actions: bookingmoodActions,
};
