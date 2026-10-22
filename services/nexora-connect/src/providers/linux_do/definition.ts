import type { ProviderDefinition } from "../../core/types.ts";

import { linuxDoActions } from "./actions.ts";

const service = "linux_do";

export const provider: ProviderDefinition = {
  service,
  displayName: "Linux DO",
  categories: ["Social", "Developer Tools"],
  authTypes: ["no_auth"],
  auth: [{ type: "no_auth" }],
  homepageUrl: "https://linux.do",
  actions: linuxDoActions,
};
