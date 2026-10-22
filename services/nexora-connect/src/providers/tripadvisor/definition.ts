import type { ProviderDefinition } from "../../core/types.ts";

import { tripadvisorActions } from "./actions.ts";

const service = "tripadvisor";

export const provider: ProviderDefinition = {
  service,
  displayName: "Tripadvisor",
  categories: ["Location", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "TRIPADVISOR_API_KEY",
      description:
        "Tripadvisor Content API key passed as the key query parameter. Sign in and get or manage your key at https://www.tripadvisor.com/business/solutions/hotels/content-api.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://www.tripadvisor.com/developers",
  actions: tripadvisorActions,
};
