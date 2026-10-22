import type { ProviderDefinition } from "../../core/types.ts";

import { opengraphIoActions } from "./actions.ts";

const service = "opengraph_io";

export const provider: ProviderDefinition = {
  service,
  displayName: "OpenGraph.io",
  categories: ["Data", "Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "App ID",
      placeholder: "your-opengraph-app-id",
      description:
        "OpenGraph.io App ID sent as the app_id query parameter. Get it from the OpenGraph.io dashboard as described at https://www.opengraph.io/docs/concepts/auth.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://www.opengraph.io",
  actions: opengraphIoActions,
};
