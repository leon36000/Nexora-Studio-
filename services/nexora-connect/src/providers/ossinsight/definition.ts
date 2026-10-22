import type { ProviderDefinition } from "../../core/types.ts";

import { ossinsightActions } from "./actions.ts";

const service = "ossinsight";

export const provider: ProviderDefinition = {
  service,
  displayName: "OSS Insight",
  categories: ["Developer Tools", "Data"],
  authTypes: ["no_auth"],
  auth: [{ type: "no_auth" }],
  homepageUrl: "https://ossinsight.io",
  actions: ossinsightActions,
};
