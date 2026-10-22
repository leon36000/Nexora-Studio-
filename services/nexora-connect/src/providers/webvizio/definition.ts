import type { ProviderDefinition } from "../../core/types.ts";

import { webvizioActions } from "./actions.ts";

const service = "webvizio";

export const provider: ProviderDefinition = {
  service,
  displayName: "Webvizio",
  categories: ["Productivity", "Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Personal Access Token",
      placeholder: "WEBVIZIO_API_TOKEN",
      description:
        "Webvizio personal access token used with the Authorization: Bearer header for the Webvizio REST Hook API.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://webvizio.com",
  actions: webvizioActions,
};
