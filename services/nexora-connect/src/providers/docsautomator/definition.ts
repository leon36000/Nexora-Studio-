import type { ProviderDefinition } from "../../core/types.ts";

import { docsautomatorActions } from "./actions.ts";

const service = "docsautomator";

export const provider: ProviderDefinition = {
  service,
  displayName: "DocsAutomator",
  categories: ["Productivity", "Design & Media"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "docsautomator_api_key",
      description:
        "DocsAutomator API key used with the Authorization Bearer header. Create or copy it from Workspace Settings > API.",
    },
  ],
  homepageUrl: "https://www.docsautomator.co",
  actions: docsautomatorActions,
};
