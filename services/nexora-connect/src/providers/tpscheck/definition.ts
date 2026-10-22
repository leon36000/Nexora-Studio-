import type { ProviderDefinition } from "../../core/types.ts";

import { tpscheckActions } from "./actions.ts";

const service = "tpscheck";

export const provider: ProviderDefinition = {
  service,
  displayName: "TPSCheck",
  categories: ["Communication", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "TPSCHECK_API_KEY",
      description:
        "TPSCheck API key sent with the Authorization Token header. Retrieve it from your profile page: https://www.tpscheck.uk/profile/.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://www.tpscheck.uk",
  actions: tpscheckActions,
};
