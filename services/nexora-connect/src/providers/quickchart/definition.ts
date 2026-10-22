import type { ProviderDefinition } from "../../core/types.ts";

import { quickchartActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "quickchart",
  displayName: "QuickChart",
  categories: ["Developer Tools", "Design & Media"],
  authTypes: ["no_auth"],
  auth: [{ type: "no_auth" }],
  homepageUrl: "https://quickchart.io",
  actions: quickchartActions,
};
