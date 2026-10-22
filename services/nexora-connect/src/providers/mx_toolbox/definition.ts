import type { ProviderDefinition } from "../../core/types.ts";

import { mxToolboxActions } from "./actions.ts";

const service = "mx_toolbox";

/**
 * MxToolbox provider backed by the public MxToolbox API.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "MxToolbox",
  categories: ["Communication", "Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "00000000-0000-0000-0000-000000000000",
      description:
        "MxToolbox API key UUID sent in the Authorization header. Find it under Settings > API in your account: https://knowledgebase.mxtoolbox.com/home/about-api.",
    },
  ],
  homepageUrl: "https://mxtoolbox.com",
  actions: mxToolboxActions,
};
