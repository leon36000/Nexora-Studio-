import type { ProviderDefinition } from "../../core/types.ts";

import { plisioActions } from "./actions.ts";

const service = "plisio";

export const provider: ProviderDefinition = {
  service,
  displayName: "Plisio",
  categories: ["Finance"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Secret Key",
      placeholder: "SECRET_KEY",
      description:
        "Plisio secret key passed as the api_key query parameter. Generate or view it in API settings at https://plisio.net/account/api.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://plisio.net",
  actions: plisioActions,
};
