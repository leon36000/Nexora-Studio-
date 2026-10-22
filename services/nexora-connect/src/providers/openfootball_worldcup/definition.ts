import type { ProviderDefinition } from "../../core/types.ts";

import { openfootballWorldcupActions } from "./actions.ts";

const service = "openfootball_worldcup";

export const provider: ProviderDefinition = {
  service,
  displayName: "OpenFootball World Cup",
  categories: ["Data"],
  authTypes: ["no_auth"],
  auth: [{ type: "no_auth" }],
  homepageUrl: "https://github.com/openfootball/worldcup.json",
  actions: openfootballWorldcupActions,
};
