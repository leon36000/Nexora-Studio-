import type { ProviderDefinition } from "../../core/types.ts";

import { helloleadsActions } from "./actions.ts";

const service = "helloleads";

export const provider: ProviderDefinition = {
  service,
  displayName: "HelloLeads",
  categories: ["Marketing", "Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Web Form Key",
      placeholder: "helloleads_web_form_key",
      description:
        "HelloLeads Web Form Key used by HelloForm / Web Form Integration. Copy it from Settings > Web Form Integration > Website Integration, where the official guide shows the embedded script and data-key: https://helloleads.io/knowledge-base/converting-your-website-enquires-as-leads/ and https://helloleads.io/learnmore-web/helloform-customization/.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://www.helloleads.io/",
  actions: helloleadsActions,
};
