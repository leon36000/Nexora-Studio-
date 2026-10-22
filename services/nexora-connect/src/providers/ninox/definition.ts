import type { ProviderDefinition } from "../../core/types.ts";

import { ninoxActions } from "./actions.ts";

const service = "ninox";

/**
 * Ninox provider backed by the public Ninox API.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "Ninox",
  categories: ["Productivity", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Personal Access Token",
      placeholder: "ninox_pat",
      description:
        "Ninox Personal Access Token used with the Authorization Bearer header. View and manage it in Admin settings > Personal Access Tokens in the Ninox web app, as described in the official API introduction: https://forum.ninox.com/t/83yzlg7/introduction-to-ninox-api",
      extraFields: [],
    },
  ],
  homepageUrl: "https://ninox.com",
  actions: ninoxActions,
};
