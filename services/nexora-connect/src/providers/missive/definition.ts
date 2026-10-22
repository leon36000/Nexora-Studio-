import type { ProviderDefinition } from "../../core/types.ts";

import { missiveActions } from "./actions.ts";

const service = "missive";

export const provider: ProviderDefinition = {
  service,
  displayName: "Missive",
  categories: ["Communication", "Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "missive_pat-xxxxxxxx",
      description:
        "Missive personal API token sent with the Authorization Bearer header. Create it from Missive Preferences > API: https://missiveapp.com/docs/developers/rest-api.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://missiveapp.com",
  actions: missiveActions,
};
