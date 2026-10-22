import type { ProviderDefinition } from "../../core/types.ts";

import { indiegogoActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "indiegogo",
  displayName: "Indiegogo",
  categories: ["Finance", "Marketing"],
  authTypes: ["no_auth"],
  auth: [{ type: "no_auth" }],
  homepageUrl: "https://www.indiegogo.com",
  actions: indiegogoActions,
};
