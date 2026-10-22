import type { ProviderDefinition } from "../../core/types.ts";

import { runscopeActions } from "./actions.ts";

const service = "runscope";

export const provider: ProviderDefinition = {
  service,
  displayName: "Runscope",
  categories: ["Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Personal Access Token",
      placeholder: "runscope_access_token",
      description:
        "Runscope API Monitoring personal access token sent as a Bearer token. Generate or view personal access tokens in the BlazeMeter API Monitoring account settings: https://api.runscope.com/applications.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://www.blazemeter.com/api-monitoring",
  actions: runscopeActions,
};
