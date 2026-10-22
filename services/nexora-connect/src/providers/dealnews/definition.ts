import type { ProviderDefinition } from "../../core/types.ts";

import { dealNewsActions } from "./actions.ts";

const service = "dealnews";

export const provider: ProviderDefinition = {
  service,
  displayName: "DealNews",
  categories: ["Marketing", "Data"],
  authTypes: ["no_auth"],
  auth: [{ type: "no_auth" }],
  homepageUrl: "https://www.dealnews.com/",
  actions: dealNewsActions,
};
